import type { Metadata } from "next";
import { ContentHeader } from "@/components/content/ContentHeader";
import { ContentFooter } from "@/components/content/ContentFooter";

export const metadata: Metadata = {
  title: "The Connection Room Philosophy",
};

export default function PhilosophyPage() {
  return (
    <div className="tcr-page">
      <ContentHeader active="philosophy" />

      <section className="section section--center">
        <div className="wrap">
          <p className="eyebrow">The Connection Room Philosophy</p>
          <h1>
            We built this because isolation is <em>the real epidemic.</em>
          </h1>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <p>
            Most men I&rsquo;ve worked with over the past eight years didn&rsquo;t come to me because
            they&rsquo;d lost the ability to have sex. They came because they&rsquo;d lost the ability to
            be touched, to be known, to let another person see them without performing for it.
            Somewhere along the way, they learned that needing connection was a liability. So they
            got good at looking fine. Getting by. Handling it.
          </p>
          <p>The Connection Room exists for the moment after that stops working.</p>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap">
          <p className="eyebrow">Not a bigger network</p>
          <h2>This is an environment, not a platform.</h2>
          <p>
            There&rsquo;s a difference between a place that gives you access to people and a place
            that gives you access to yourself, alongside other men doing the same work. We&rsquo;re
            not interested in building a bigger network. We&rsquo;re interested in what happens inside
            this one: who&rsquo;s in the room, what gets said honestly, what gets practiced and not
            just discussed.
          </p>
          <p>
            That means The Connection Room isn&rsquo;t built around matching, swiping, or collecting
            connections like trophies. It&rsquo;s built around presence. What you put into this room
            is largely what you&rsquo;ll get out of it, and that&rsquo;s by design.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">No competition here</p>
          <h2>Every man&rsquo;s journey looks different, and that&rsquo;s the point.</h2>
          <p>
            Some of you are here because you clicked into a webinar out of curiosity and aren&rsquo;t
            sure what happens next. Others are deep into coaching work and looking for a community
            that understands what that work actually costs and gives. Both belong in the same room.
            Growth isn&rsquo;t a competition, and we&rsquo;ve built this space so that a man in his
            first week of noticing his own patterns can sit alongside a man three years into
            unlearning them, without either one feeling out of place.
          </p>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap">
          <p className="eyebrow">The whole spectrum</p>
          <h2>
            Gay, bisexual, straight, curious: <em>the work is the same.</em>
          </h2>
          <p>
            Desire and identity show up differently for every man who walks through this door, but
            the underlying work rarely does. Learning to stay present in your body. Learning to ask
            for what you actually want instead of what you think you should want. Learning that
            vulnerability isn&rsquo;t the opposite of masculinity, it&rsquo;s a form of it we were
            never taught. This room holds men across that whole spectrum, because the work of
            reconnecting to your own body and your capacity for intimacy doesn&rsquo;t check your
            orientation at the door.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">The foundation</p>
          <h2>Real connection requires real discretion.</h2>
          <p>
            What gets shared in this room is often more honest than what gets shared anywhere else
            in a man&rsquo;s life. That only works if this stays a place where honesty is safe. We
            take that seriously, and we ask every member to take it just as seriously. More on that
            in our <a href="/house-rules">House Rules</a>.
          </p>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap">
          <p className="eyebrow">Between sessions</p>
          <h2>This supports the work. It doesn&rsquo;t replace it.</h2>
          <p>
            The Connection Room is a community, not a therapy session and not a substitute for the
            deeper one-on-one work some of you are doing through coaching, bodywork, or our
            programs. Think of it as the room you return to between sessions: a place to process, to
            be witnessed, to practice showing up differently with other men who are doing the same.
            It&rsquo;s here to hold you in the in-between, not to be the whole of the work.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">On the name</p>
          <h2>Why &ldquo;Connection Room&rdquo; and not something bigger</h2>
          <p>
            We named it plainly on purpose. Not a movement. Not a revolution. A room. Rooms are
            where real things happen: honest conversations, quiet realizations, the specific kind of
            relief that comes from finally saying the thing out loud to someone who doesn&rsquo;t
            flinch. That&rsquo;s what we&rsquo;re building here, one room at a time.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="panel-dark">
            <p className="quote">&ldquo;Welcome in.&rdquo;</p>
            <div className="attribution">
              <div className="avatar">TJ</div>
              <span>&mdash; Trevor James</span>
            </div>
          </div>
        </div>
      </section>

      <ContentFooter hide="philosophy" />
    </div>
  );
}
