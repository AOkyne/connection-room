-- Assign seeded posts to seeded profiles by author_name
-- This migration updates the NULL author_name values with actual profile display_names

UPDATE posts SET author_name = 'Marcus Harrison'
WHERE id = '4593e822-385a-510c-8c18-68bad2fe2719';

UPDATE posts SET author_name = 'Daniel Rivera'
WHERE id = 'bc302285-43d0-5acd-bda2-240186ff253b';

UPDATE posts SET author_name = 'James Thompson'
WHERE id = 'eeb3078d-9307-5867-9474-e88d5deb41ea';

UPDATE posts SET author_name = 'Michael Patterson'
WHERE id = '493f827d-b631-53ec-8233-a85d1f020cb5';

UPDATE posts SET author_name = 'Christopher Williams'
WHERE id = 'f3c02198-e14a-5568-91ec-616b44b0a5de';

UPDATE posts SET author_name = 'Benjamin Moore'
WHERE id = '0ab47ba1-9ef8-5bb9-b7f2-4c7e44695d60';

UPDATE posts SET author_name = 'David Chen'
WHERE id = '3e65224b-a2f9-5c72-9bcb-de94ec6934a5';

UPDATE posts SET author_name = 'Gabriel Martinez'
WHERE id = 'bc825afc-3441-558c-84be-db5b25636004';

UPDATE posts SET author_name = 'Isaac Brown'
WHERE id = '6f766808-87b5-56da-8a5d-0e725b8a04db';

UPDATE posts SET author_name = 'Jacob Davis'
WHERE id = '7f94e4ec-b383-5a3f-99ca-e9f412e74430';

UPDATE posts SET author_name = 'Jordan Klein'
WHERE id = '415a04e0-408c-5ac4-b4cc-7f9296ef5357';

UPDATE posts SET author_name = 'Liam Stewart'
WHERE id = '5c03ed36-b993-52b0-b201-3b059cb723f1';

UPDATE posts SET author_name = 'Lucas Johnson'
WHERE id = 'e680c3bf-9afa-5152-a611-f48da7c0733e';

UPDATE posts SET author_name = 'Marcus Harrison'
WHERE id = 'c3e1d7b1-4adf-5966-b21a-7431f1c6fcb1';

UPDATE posts SET author_name = 'Noah Grant'
WHERE id = 'de28d666-fdb0-5850-a2ab-ad4acb64a1b9';

UPDATE posts SET author_name = 'Oliver Foster'
WHERE id = '989d6ade-5623-512b-aafc-788eed393dad';

UPDATE posts SET author_name = 'Daniel Rivera'
WHERE id = 'b13335ee-69d6-5f42-91ca-9b93051ab6c4';

UPDATE posts SET author_name = 'Ryan Parker'
WHERE id = '2fe2574c-1da6-5113-8200-d1a5651d8bb3';

UPDATE posts SET author_name = 'James Thompson'
WHERE id = 'ff20135a-f7e2-5866-a8c8-82215443da49';

UPDATE posts SET author_name = 'Michael Patterson'
WHERE id = '05d7328e-5b63-5e52-bbcb-6fb0d96ea181';

UPDATE posts SET author_name = 'Christopher Williams'
WHERE id = '02507f50-b613-5269-a783-6393890702d1';

UPDATE posts SET author_name = 'Benjamin Moore'
WHERE id = '96743880-bfa9-5c7c-9752-9c4068361cbb';

UPDATE posts SET author_name = 'David Chen'
WHERE id = '9926dcc3-9c55-5d51-bef6-71806482cea6';

UPDATE posts SET author_name = 'Gabriel Martinez'
WHERE id = '0ee4e9e4-97d8-5087-ac2a-03214e69d0f0';

UPDATE posts SET author_name = 'Isaac Brown'
WHERE id = '0bb1cb5b-5c9c-5d02-ac03-b7704bbd0437';

UPDATE posts SET author_name = 'Jacob Davis'
WHERE id = '643fc66e-d909-5a9b-b482-ebf21020ebd8';

UPDATE posts SET author_name = 'Jordan Klein'
WHERE id = '8ea1f522-5ffd-5043-8200-f2be0fc8dbb4';

UPDATE posts SET author_name = 'Liam Stewart'
WHERE id = 'ff72492f-5224-507c-a61d-d4ca3cf84522';

UPDATE posts SET author_name = 'Lucas Johnson'
WHERE id = 'cf0b7b86-9408-5f3a-8f25-08fb1def7455';

UPDATE posts SET author_name = 'Marcus Harrison'
WHERE id = 'b4105398-748f-567c-aec9-dfa2df70fce7';

UPDATE posts SET author_name = 'Noah Grant'
WHERE id = 'd663a5cf-4ecb-5ee7-88cc-188288b84af7';

UPDATE posts SET author_name = 'Oliver Foster'
WHERE id = 'b6d2d9e1-e6c6-5342-aa56-eb4e48390663';

UPDATE posts SET author_name = 'Daniel Rivera'
WHERE id = '697a75ed-d32a-5901-b1fe-d9f36d37c570';

UPDATE posts SET author_name = 'Ryan Parker'
WHERE id = '09bfd7d6-bd0b-5c24-98ca-e07d4c9d6027';

UPDATE posts SET author_name = 'James Thompson'
WHERE id = 'f42d0f22-bd50-51c9-b475-bc5c483bae05';

UPDATE posts SET author_name = 'Michael Patterson'
WHERE id = '704caff8-3eeb-5ca3-8101-cbb39baaa8d4';

UPDATE posts SET author_name = 'Christopher Williams'
WHERE id = '7af99368-38b0-5088-80e1-d89ff3677fe3';

UPDATE posts SET author_name = 'Benjamin Moore'
WHERE id = 'c0615e0f-11a5-5679-93fa-7b4436ba0455';

-- Assign seeded comments to profiles
UPDATE comments SET author_name = 'David Chen'
WHERE id = '0b3c9b46-5a41-5b1e-9ed3-693c68d39a23';

UPDATE comments SET author_name = 'Gabriel Martinez'
WHERE id = 'bee2fb2c-daf0-521a-ad9c-ce7a0c131fb1';

UPDATE comments SET author_name = 'Isaac Brown'
WHERE id = '3cfc2a21-414c-5424-8dc3-8d5d13e8e709';

UPDATE comments SET author_name = 'Jacob Davis'
WHERE id = 'd18ab27d-0afd-5859-a14d-829ad264896c';

UPDATE comments SET author_name = 'Jordan Klein'
WHERE id = '6f60b960-5241-5c2c-a71d-bfdb0d929d43';

UPDATE comments SET author_name = 'Liam Stewart'
WHERE id = '3613c20e-e9ee-51db-a0ae-546886b11853';

UPDATE comments SET author_name = 'Lucas Johnson'
WHERE id = '70d69afa-be6c-5ef8-972e-ee86c72358d7';

UPDATE comments SET author_name = 'Marcus Harrison'
WHERE id = '38909e01-f755-57fa-ad03-6b2708b1d906';

UPDATE comments SET author_name = 'Noah Grant'
WHERE id = 'fee1f55e-15de-5a14-a988-4e73360fa618';

UPDATE comments SET author_name = 'Oliver Foster'
WHERE id = '46d6fee7-2ae0-5b80-b2ff-7cc73805e89a';

UPDATE comments SET author_name = 'Daniel Rivera'
WHERE id = '12cb3615-9a9c-57f6-a59f-5f6b05323ec1';

UPDATE comments SET author_name = 'Ryan Parker'
WHERE id = '82af3999-d523-5e8d-bf9d-c0e93240ff48';

UPDATE comments SET author_name = 'James Thompson'
WHERE id = 'cc06f0cb-a213-584b-bd9d-aac19e41091a';

UPDATE comments SET author_name = 'Michael Patterson'
WHERE id = '52b2a056-c610-51a2-9ce0-d4350e2d6e4e';

UPDATE comments SET author_name = 'Christopher Williams'
WHERE id = '040eac3b-96c2-5148-bc6c-eee384704c45';

UPDATE comments SET author_name = 'Benjamin Moore'
WHERE id = '34ab37c4-617e-5864-80d5-c69701e92129';

UPDATE comments SET author_name = 'David Chen'
WHERE id = 'd9d64348-53c2-5c90-b110-08e7c6ae5a63';

UPDATE comments SET author_name = 'Gabriel Martinez'
WHERE id = '27d3e9b3-4024-5ff5-8f01-e05f459f7ffc';

UPDATE comments SET author_name = 'Isaac Brown'
WHERE id = 'dc6a7ee9-9f21-5f62-a6c8-408fe848c944';

UPDATE comments SET author_name = 'Jacob Davis'
WHERE id = '14266917-45ee-528c-87c5-d36e2043aa63';

UPDATE comments SET author_name = 'Jordan Klein'
WHERE id = 'b8427208-2f20-5846-bf3d-b6831697e934';

UPDATE comments SET author_name = 'Liam Stewart'
WHERE id = 'ea565908-c258-5313-af85-e60c5392afa5';

UPDATE comments SET author_name = 'Lucas Johnson'
WHERE id = '599c8155-f7d4-5a22-b1c4-b094e7b33666';

UPDATE comments SET author_name = 'Marcus Harrison'
WHERE id = 'b5e8ba7e-9907-507f-a907-eaf510e8c7e3';

UPDATE comments SET author_name = 'Noah Grant'
WHERE id = 'a7bee3dd-a8bc-5aac-8e93-5c946b9ffb42';

UPDATE comments SET author_name = 'Oliver Foster'
WHERE id = 'a14a754a-41ec-5c43-93ca-d8b85984e3da';

UPDATE comments SET author_name = 'Daniel Rivera'
WHERE id = '1c67de08-04b3-54e1-a63a-e7a50f9b8421';

UPDATE comments SET author_name = 'Ryan Parker'
WHERE id = '704fd07c-dd0d-5a2a-8f46-c02c7325dfe3';

UPDATE comments SET author_name = 'James Thompson'
WHERE id = '42dc8ceb-c5ff-51b2-86ad-074881254e08';

UPDATE comments SET author_name = 'Michael Patterson'
WHERE id = '6989938f-73c7-51fb-be92-0cc317177b80';

UPDATE comments SET author_name = 'Christopher Williams'
WHERE id = '73ac81b2-c4f8-52d5-8b61-7cb7f995c42a';

UPDATE comments SET author_name = 'Benjamin Moore'
WHERE id = '0a7f518f-50a1-5b1e-bea1-f7ca7b8c0ac0';

UPDATE comments SET author_name = 'David Chen'
WHERE id = '243784b6-e708-5a66-b996-200f8fdab7f6';

UPDATE comments SET author_name = 'Gabriel Martinez'
WHERE id = '402d188e-3f80-5f21-a8d0-08c87de0a8d6';

UPDATE comments SET author_name = 'Isaac Brown'
WHERE id = '6e38b0a5-09fa-588b-9017-d3cfffeaf571';

UPDATE comments SET author_name = 'Jacob Davis'
WHERE id = '4d6b0a4a-7319-563d-b5d5-8fb873a9ed14';

UPDATE comments SET author_name = 'Jordan Klein'
WHERE id = 'd4ce40d4-4198-5847-aedb-dcce397aa9fa';

UPDATE comments SET author_name = 'Liam Stewart'
WHERE id = 'ddf9441e-ac71-58f2-913f-e7dcb7ddf515';

UPDATE comments SET author_name = 'Lucas Johnson'
WHERE id = 'e6188a75-5f30-548b-a17c-a64a20bac6de';

UPDATE comments SET author_name = 'Marcus Harrison'
WHERE id = 'ca22d2b4-d4ec-5bee-ad9a-1250764fb8de';

UPDATE comments SET author_name = 'Noah Grant'
WHERE id = 'e24bdd62-f7c5-577d-abec-d6271f427418';

UPDATE comments SET author_name = 'Oliver Foster'
WHERE id = '5537282e-35a3-5938-ac35-f9929e6b6294';

UPDATE comments SET author_name = 'Daniel Rivera'
WHERE id = 'cea9bfb0-2a27-5ea6-9d98-b7e1573ea6de';

UPDATE comments SET author_name = 'Ryan Parker'
WHERE id = 'a46cc790-bdb3-5a35-91b7-d662d5cd3134';

UPDATE comments SET author_name = 'James Thompson'
WHERE id = 'f16d17b9-8bb2-5ae4-b554-fe90b834b7dc';

UPDATE comments SET author_name = 'Michael Patterson'
WHERE id = '336c2045-c291-5e54-aafb-229c70e7ca57';

UPDATE comments SET author_name = 'Christopher Williams'
WHERE id = '7adc2a2a-bb75-5e8b-8d59-e367b2b408e6';

UPDATE comments SET author_name = 'Benjamin Moore'
WHERE id = '71d8d815-451f-53e2-a3f6-0cfd2b75c69a';

UPDATE comments SET author_name = 'David Chen'
WHERE id = '97ec546f-47ed-5c8d-baa3-61480dbb5347';

UPDATE comments SET author_name = 'Gabriel Martinez'
WHERE id = 'e00f6842-5b3e-5b60-9345-b4d12d5fe8e0';

UPDATE comments SET author_name = 'Isaac Brown'
WHERE id = '3d397ada-da93-52c1-978c-3ec11f2bdd37';

UPDATE comments SET author_name = 'Jacob Davis'
WHERE id = '821775fa-e6bb-57e1-929f-463e15a3130e';

-- Verify the updates
SELECT 
  (SELECT COUNT(*) FROM posts WHERE is_seeded = TRUE AND author_name IS NOT NULL) as posts_with_names,
  (SELECT COUNT(*) FROM comments WHERE is_seeded = TRUE AND author_name IS NOT NULL) as comments_with_names;
