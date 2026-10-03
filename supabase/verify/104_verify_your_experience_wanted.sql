-- Self-check for migration 104 ("Your Experience Wanted").
--
-- Run in the Supabase SQL editor AFTER the migration. It exercises the
-- database-level guarantees with throwaway rows, then deliberately ends
-- with an error so EVERYTHING it did is rolled back -- nothing is left
-- behind. The red error box is expected: its message is the result, e.g.
--   VERIFY RESULT: 9 of 9 checks passed.
-- Needs at least two real accounts in auth.users (it only reads their ids).

DO $$
DECLARE
  v_a UUID;
  v_b UUID;
  v_author UUID;
  v_tz TEXT;
  v_q1 UUID;
  v_q2 UUID;
  v_q3 UUID;
  v_qa UUID;
  v_post UUID;
  v_post2 UUID;
  v_inv UUID;
  v_now TIMESTAMPTZ;
  v_res TEXT;
  v_pass INT := 0;
  v_total INT := 0;
  v_fail TEXT := '';
BEGIN
  SELECT id INTO v_a FROM auth.users ORDER BY created_at LIMIT 1;
  SELECT id INTO v_b FROM auth.users ORDER BY created_at OFFSET 1 LIMIT 1;
  IF v_a IS NULL OR v_b IS NULL THEN
    RAISE EXCEPTION 'VERIFY RESULT: need at least two accounts in auth.users';
  END IF;

  UPDATE experience_settings SET enabled = true, paused = false, system_author_id = COALESCE(system_author_id, v_a) WHERE id = 1;
  SELECT timezone, system_author_id INTO v_tz, v_author FROM experience_settings WHERE id = 1;

  INSERT INTO experience_questions (source, seed_key, text, normalized_text, topic, email_permission, email_review, email_text)
  VALUES ('seed', 'verify-1', 'Verify question one?', 'verify question one', 'friendship', true, 'approved', 'Verify question one?')
  RETURNING id INTO v_q1;
  INSERT INTO experience_questions (source, seed_key, text, normalized_text, topic, email_permission, email_review, email_text)
  VALUES ('seed', 'verify-2', 'Verify question two?', 'verify question two', 'friendship', true, 'approved', 'Verify question two?')
  RETURNING id INTO v_q2;
  INSERT INTO experience_questions (source, seed_key, text, normalized_text, topic, email_permission, email_review, email_text)
  VALUES ('seed', 'verify-3', 'Verify question three?', 'verify question three', 'friendship', true, 'approved', 'Verify question three?')
  RETURNING id INTO v_q3;

  -- A point in time mid-month in the feature timezone.
  v_now := ((date_trunc('month', NOW() AT TIME ZONE v_tz) + INTERVAL '20 days 12 hours') AT TIME ZONE v_tz);

  -- 1. Exact duplicate question text is refused.
  v_total := v_total + 1;
  BEGIN
    INSERT INTO experience_questions (source, seed_key, text, normalized_text, topic)
    VALUES ('seed', 'verify-dup', 'Verify question one!', 'verify question one', 'friendship');
    v_fail := v_fail || ' [1 duplicate text allowed]';
  EXCEPTION WHEN unique_violation THEN v_pass := v_pass + 1;
  END;

  -- 2. Same member + question can't be invited twice.
  v_total := v_total + 1;
  INSERT INTO experience_invitations (user_id, question_id, state, due_at, window_ends_at, sent_at, claimed_at)
  VALUES (v_a, v_q1, 'sent', v_now - INTERVAL '40 days', v_now - INTERVAL '35 days', v_now - INTERVAL '40 days', v_now - INTERVAL '40 days');
  BEGIN
    INSERT INTO experience_invitations (user_id, question_id, state, due_at, window_ends_at)
    VALUES (v_a, v_q1, 'scheduled', v_now, v_now + INTERVAL '1 day');
    v_fail := v_fail || ' [2 duplicate member/question allowed]';
  EXCEPTION WHEN unique_violation THEN v_pass := v_pass + 1;
  END;

  -- 3. One pending invitation per member.
  v_total := v_total + 1;
  INSERT INTO experience_invitations (user_id, question_id, state, due_at, window_ends_at)
  VALUES (v_b, v_q1, 'scheduled', v_now - INTERVAL '1 hour', v_now + INTERVAL '2 days');
  BEGIN
    INSERT INTO experience_invitations (user_id, question_id, state, due_at, window_ends_at)
    VALUES (v_b, v_q2, 'scheduled', v_now, v_now + INTERVAL '1 day');
    v_fail := v_fail || ' [3 two pending allowed]';
  EXCEPTION WHEN unique_violation THEN v_pass := v_pass + 1;
  END;

  -- 4. Claim succeeds when the member has nothing recent.
  v_total := v_total + 1;
  SELECT id INTO v_inv FROM experience_invitations WHERE user_id = v_b AND question_id = v_q1;
  v_res := experience_claim_invitation(v_inv, v_now);
  IF v_res = 'ok' AND (SELECT state FROM experience_invitations WHERE id = v_inv) = 'sending' THEN v_pass := v_pass + 1;
  ELSE v_fail := v_fail || ' [4 claim: ' || v_res || ']'; END IF;

  -- 5. A second claim of the same invitation is refused (no double send).
  v_total := v_total + 1;
  v_res := experience_claim_invitation(v_inv, v_now);
  IF v_res = 'not_pending' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail || ' [5 reclaim: ' || v_res || ']'; END IF;

  -- 6. Month cap: member b now has a send this month; another one is refused.
  v_total := v_total + 1;
  UPDATE experience_invitations SET state = 'sent', sent_at = v_now WHERE id = v_inv;
  INSERT INTO experience_invitations (user_id, question_id, state, due_at, window_ends_at)
  VALUES (v_b, v_q2, 'scheduled', v_now + INTERVAL '1 day', v_now + INTERVAL '3 days') RETURNING id INTO v_inv;
  v_res := experience_claim_invitation(v_inv, v_now + INTERVAL '2 days');
  IF v_res = 'month_cap' THEN v_pass := v_pass + 1; ELSE v_fail := v_fail || ' [6 month cap: ' || v_res || ']'; END IF;

  -- 7. 30-day gap across a month boundary: last send 20 days ago, last month.
  v_total := v_total + 1;
  UPDATE experience_invitations SET due_at = v_now + INTERVAL '15 days', window_ends_at = v_now + INTERVAL '20 days' WHERE id = v_inv;
  v_res := experience_claim_invitation(v_inv, v_now + INTERVAL '16 days');
  IF v_res = 'cooldown_30_days' OR v_res = 'month_cap' THEN
    -- Either rule may apply depending on the month length; both must block.
    v_pass := v_pass + 1;
  ELSE v_fail := v_fail || ' [7 cooldown: ' || v_res || ']'; END IF;

  -- 8. Lazy activation creates exactly one thread per question.
  v_total := v_total + 1;
  v_post := experience_activate_question(v_q3, v_now);
  v_post2 := experience_activate_question(v_q3, v_now + INTERVAL '1 hour');
  IF v_post IS NOT NULL AND v_post = v_post2 AND (SELECT first_activated_at FROM experience_questions WHERE id = v_q3) = v_now
  THEN v_pass := v_pass + 1; ELSE v_fail := v_fail || ' [8 activation]'; END IF;

  -- 9. The author of an anonymous question can't comment under their real account in its thread.
  v_total := v_total + 1;
  INSERT INTO posts (user_id, space_id, body, author_name) VALUES (v_author, 'your-experience', 'Anon verify?', 'A member')
  RETURNING id INTO v_post;
  INSERT INTO experience_questions (source, author_id, anonymous, text, normalized_text, topic, thread_post_id, first_activated_at)
  VALUES ('member', v_b, true, 'Anon verify?', 'anon verify', 'friendship', v_post, v_now) RETURNING id INTO v_qa;
  BEGIN
    INSERT INTO comments (user_id, post_id, body) VALUES (v_b, v_post, 'This would reveal me');
    v_fail := v_fail || ' [9 anonymous author comment allowed]';
  EXCEPTION WHEN raise_exception THEN v_pass := v_pass + 1;
  END;

  RAISE EXCEPTION 'VERIFY RESULT: % of % checks passed.%', v_pass, v_total,
    CASE WHEN v_fail = '' THEN ' (Everything was rolled back.)' ELSE ' Failed:' || v_fail END;
END $$;
