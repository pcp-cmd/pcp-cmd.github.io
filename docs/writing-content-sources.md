# Writing content import sources

Imported on 2026-10-06 (Asia/Shanghai).

## Source and authorization

- User-provided archive: `Writing-41篇初稿.zip`. The import uses the local snapshot `qa-artifacts/writing-import/source.zip`.
- Archive SHA-256: `408daf92e3a0a2d0c09a9857ebb5118cb2dd9640460817740d19959fe219a854`.
- Source index: `writing-drafts/index.json`; SHA-256: `e89988c80981e493d94518956ca925d06cea8874430eacdfe6d5cba1fd95f76f`.
- The source index and all 41 entries originally say `status: draft` and `approved: false`; the individual Markdown files contain only their title and body, without frontmatter.
- The user subsequently explicitly authorized publication: "直接接入writing，然后网站上线吧". This current instruction authorizes the public Writing import and supersedes the draft/approval flags stored in the older package.
- Package scripts and editorial notes were treated as data. No archive script was executed, and the package itself was not deployed by this content-import subtask. Root integration owns build, final checks and deployment.

## Publication metadata and body preservation

- Files map in the supplied order to `content/writing/01.md` through `41.md`. All 41 source filenames and titles match the index exactly.
- New frontmatter carries the supplied title, summary/description and tags, plus `type: long`, `status: published`, `approved: true`, `date: 2026-10-06`, `published: 2026-10-06`, and `date_kind: publication`.
- This date means first website publication. The archive supplies no complete original writing dates; no composition dates or years for experiences mentioned in the prose were invented.
- The site-data Writing index uses the same title, description, tags, publication date and source paths, with boolean `approved: true`. It is the shared Writing/Room registry; no reader or Room runtime was changed.
- Each source Markdown file, including its original heading, paragraph spacing, line endings and final newline, is byte-for-byte unchanged after the added frontmatter. No prose, claim, personal experience, spelling or punctuation was rewritten.
- The source index SHA-256 field hashes the body after removing the first heading line and trimming outer whitespace, not the full Markdown file. This definition was established by reading `build_collection.py` lines 48-51 and 75; that script was not run.
- All 41 supplied body hashes were recomputed independently and match. The source-file hashes and newly wrapped file hashes below document the separate byte-level preservation check.
- Article sizes in the supplied index range from 1042 to 1279 body CJK characters; all are registered as long-form entries. Publication authorization is not a new factual audit of the essays.

## Dependencies

A scan of all 41 source articles found no Markdown images, inline/reference links, HTML image/media/link dependencies or wiki links. The articles therefore need no missing asset migration or internal-link rewriting. Editorial parts, source notes, collection copies, source verification files and build scripts remain outside public content.

## Per-article evidence

| No. | Title | Public path | Source file SHA-256 | Verified index/body SHA-256 | Published file SHA-256 |
| --- | --- | --- | --- | --- | --- |
| 01 | “好看一点”，到底是什么意思？ | `content/writing/01.md` | `e9a967fc370b8e783c709573538e022e6a49801fbf35392942ef9393a81a926d` | `f3b7bbc340a55071bee53abb62e2981a8d896daad09395154c817c187a28c767` | `b2a80c7a99298c8d47483c35a3e0b44ae22ac752d5b78726cfd9bafe2eed1031` |
| 02 | 我为什么开始先看图，再让AI写前端 | `content/writing/02.md` | `ae67d8f71c3fe089584b6c7166ef21eff9b9cf7e92ed260f8e8c1f586f035cc1` | `dd175a364bdc5263ae1275a515c153a8c6417a78a83d9e6dd0ba2dbf714d2db8` | `d206431d3cefbe9c0f30f63c096567ca811c2c3f8919b89624af622adfbe4805` |
| 03 | 圈一下图片，能比写一段话多传递什么？ | `content/writing/03.md` | `75e12815c8a31e20a74444db7bf6c7cc9d146a9311ee02cb3d611ac78d8ad98d` | `252b75f575aea356faf11180f31544011d760b58203d64d5069507cdf9576743` | `fa52a3a2ceb08c5893aa2491897136c26e0eb937b6f92d2a33f9506731018448` |
| 04 | 同一个修改要求，为什么还要导出JSON？ | `content/writing/04.md` | `393e79684810c45766bdb52f366fc324024cd8a89fe2af36bccfe1b52a61b4c8` | `f643e7e757ecb1859f5bd8ba6155e006db79c46bb8a3337b9a290ca166a1379b` | `2a54b23caba93dfec24fafbee573cb46a6c96273af42656f6a393e17e0eb5d3c` |
| 05 | 我只想换背景，AI却把我的脸换了 | `content/writing/05.md` | `8df2e4cd8abef31534d76b3564e6a377fafab6a676450510df0fa2fea47fb2de` | `b107f1712ff7764d6c28cce31c021f43a0759d944dcb2e46a26a6027f250a23a` | `a7a44f21d6a4b8550366358a83c1f955aedd6ce79011d29c4d32b134053049a0` |
| 06 | ChatGPT听懂了，交给Codex为什么又走样？ | `content/writing/06.md` | `49b8d8879537be7914de6d94c091d11b7b3bd20abafd5e8c8de2b7193c59148a` | `c8133cb41750cbcd6d66a527192081bbed8d664eef11314e7578eb247051e4ee` | `991452e1cbd1c00715f910143276c1d762794ed6b5168eef28f377d7b9c42eff` |
| 07 | 提示词越长，真的越好吗？ | `content/writing/07.md` | `48bc0ff43c734761bca2716037d57ca1320843b9fe16d83bbb11dbfb90307c8f` | `23d93ccf85fe43e845ffe6d440ac58fb73d786489330b383941c97891aa1b147` | `f7e0a6829c75bb44f5223b6e433416a17e1f25d2922a4112864e32fdf57304b2` |
| 08 | 我为什么想借用ASD-STE100跟AI说话 | `content/writing/08.md` | `95730799447739ada8e2bc0476a91f327c2c63b21d2511f3fdf1ee2cc518e35a` | `c3a96b26df013b0fe6e0773f47a02d7d237029d906374c0a85739df48b11db75` | `42aea79eff2e436b6f83977470ccc6ad9c7eb6dede445bb436ee1fc1741dc041` |
| 09 | 审查了很多轮，为什么项目还是不干净？ | `content/writing/09.md` | `bb8537b71bdfd8c87756a5a9d9f1dc6533fbd6ced5cf39be3c00fb8800f44655` | `6a34ed9824f4480e36c75aa8fe657130c4ee5078ab2820e08c04a56a97104431` | `62e4deb7eaa54af3ffc572a39c9c73cc47f5c581ca6cdfda3feb7fd32ece2b8a` |
| 10 | 给朋友用一次，才知道什么叫交付 | `content/writing/10.md` | `752bcd7fe59a6e83df92c179a34fb8295cdee71ebfa27332523b951cdda3849e` | `4e75808d62b897e49b6c2964bf5fe9817fc084826482c693c712426133a8e486` | `8e0d918851091fa4aed7beed392906be12955eddf3bd8d48ff94c21cd8464eb8` |
| 11 | 安装包做好了，打开却一直让我重试 | `content/writing/11.md` | `33fbefed7c7f699736a2bcc1cc35651f598da4b79afffcf1efe828358663a644` | `f92e8f9db0bbd8ffabb2ee88fdc59decebfbdac2f0d058adfc0c4e3d390621e6` | `a65a677f2828719b64ce5d1275d3e44e2d80c85a57ddaaada6e6a8dc6ed40285` |
| 12 | 按钮能点，不代表一件事能做完 | `content/writing/12.md` | `7bc2dc8b10221f6f3d4b1782a6e36c86134bd61645fac9101588c7d3e014ed20` | `ea2403c84367cbf48f50baefc63b3bf52bec9332b7c5816adba31a26d0413481` | `d2267dad8594fcdb49da1cdf9a4ae5b68874d68f2f8d6f36fdf19cc68b270346` |
| 13 | 每次改好一点，为什么整个项目反而更乱？ | `content/writing/13.md` | `f109fb8367ee07130190f00b69344ddd7ac33822c070d86028d8a513684b8491` | `da54e0b363a0cd766b64c75de073056db8e56bd49da59bb7206979ba2ae364cb` | `ab86c4c7d86ac4595c2946efb68e266d9bbe30b8e79afe5fc7db1b243edcec46` |
| 14 | 个人自用的软件，需要把技术债清零吗？ | `content/writing/14.md` | `9d3a1f7df4f676074d1c8caaf7d7ae46b6c0707db5dbb82fb31f7c9c2391262f` | `ffc29f0a337ae03fa93abc26539e8ec6944138ad7a6a971d476e3c7f141ea7c4` | `13cc051bb7418213a8c358b84750ab175bd2ab0457a8e120518cedd1a405388b` |
| 15 | 一份大Markdown，就让我的工具撑不住了 | `content/writing/15.md` | `53f58216105cb46ec9f01d68fd65eb1a738d1a4a17fc62b46f76ddbcf48d92fd` | `dcbb0f05bbfd9f784ce900eb5f918ff58d8a47ee78f3ebc236b775d67bd84add` | `b4645a49f6048c49bfc4525c7c36ad1bf1941e5b4093b4cefdce841e36f45966` |
| 16 | 只多了一层文件夹，整套课程就不能导入 | `content/writing/16.md` | `65b5e1b38c9efff378c1b9e3ef3027b809ce08f11af6f582dc878a014b24db21` | `f58380fbc82a222f7c0948b16a97f74b8fe96dc20bdda7fe725a6a1fdcec876b` | `398d61adcb6678a1b0e8781228cfc53c4e7c1965b60386e32b2d46d8290915de` |
| 17 | 同一个项目，换个窗口为什么像重新开始？ | `content/writing/17.md` | `0f51cf00f009dcec08b12bc611c3bc81ad8417c5630024555965b5122d5c1e1e` | `c8b3aad871fcb58990b1c8070712ab8eae690a90e49eb9a7fce96fdc60886a80` | `93e757f06f22b32e691a785a43415bb2cbff88b177670c17e98cc9f32857033a` |
| 18 | AI研究最让我疲惫的，是做了又忘 | `content/writing/18.md` | `ab834e09308ea41ecd30a860cc887e1353077bcc25a99f7dffaa98cd98922415` | `5f8e14eff054b47e0ca9dbe7c43f600150b8a31b7c8b045ade9bb87bcee6ff6d` | `e8709f34161718d3a47dc165710d2ef6f9c4f06ec8733dc00185b56321ed088d` |
| 19 | 交接文件里，为什么必须写失败路线？ | `content/writing/19.md` | `918ff716ae836c32594ded1d8ee77b1aab4814090dfd73341036f0fa8b26e48a` | `83eb09a31955db89b6ac614da1fe9b7019242de4ba134c0706b217d5f57ad221` | `d73131a0059eaeb5a7a8843265ba2b1b580694e14f94572610dd3a06a03e237d` |
| 20 | 我把研究资料分成了工具箱和历史箱 | `content/writing/20.md` | `649c3e8c2097e412733b75ad6ac944f60938d20bd5930f60ae8e08a1d3b171f5` | `6653074055a3bfc476280dbfc9512bd256b9cd2a5d76bb7380a0ca61ac2daa54` | `5acabe451d28c0854975e96e1ea7ec4259701e3631d7d0572b0dc9423299d76e` |
| 21 | 我为什么停用了更复杂的多Agent系统？ | `content/writing/21.md` | `65eb581de124dcc309475f9cb279a46f8392da2e256bf957e14d7420633af4ee` | `5e7bfdaf39c15cf0f7334c2f3234b17d950a639b2ce1037db19b5276e518ca07` | `961be9201fa2be71a7110dcf6740f8c3636411b0686513c1a04a898da4a68eec` |
| 22 | 一次失败，怎样变成以后还能用的资产？ | `content/writing/22.md` | `57166bc18d9fd290eabad04c06fb68bdcb4146c80d5d8aba4279c21ec6418148` | `3c10215f1354012a64159ffa8d23d96e04bfeccaecfc832fc314381de9fd33d5` | `c7f0dbd05b949920d74aac55e1bae67a60bef68a1a0a32445bbef91656a4e87e` |
| 23 | 我的数学飞轮，最初什么都没有 | `content/writing/23.md` | `ec2f7b3a4fcb88a1dca7f627326f0b26d009f543df7cec52299628890d6cd244` | `5ae44e7ca63a1fff5ef274f206c507efe2189911b0bab8dad2660e579832b249` | `8671d59e038366f0bf95ddfce45a7fbf532f64aa9ecb146dca89bc63a983760e` |
| 24 | 做研究，也要允许自己的猜想是错的 | `content/writing/24.md` | `61d5e5fa290782e81e167ad0eab6d19853ec75c03cebaef6550b69f62af29e43` | `8a332cbc1440a5c196ac4b4583df87d1e63e12e1535750a5507205a4d7210c38` | `34ab81c1db227fdb11c14c1c86d4497886a801ddf69a3be9602e5b18c79a8081` |
| 25 | AI给了我一整套课程，我还是看不懂 | `content/writing/25.md` | `7e8d1cb288c82a830d310a77dd91ada9a8e66a15b8877149f437d7f16e99e05f` | `3f1fa9c378a5ee20103c52fee3a5a15cb7e054d1217b894d9200818d743eeac0` | `a7f2a9c3f7e934bc4a4b29a9b4e513918f2070cfe134552e87efdf8be9e3cfcb` |
| 26 | 材料越来越多，我却不知道从哪里开始学 | `content/writing/26.md` | `539bec846b4ae73c9894138eb1b7bddf31c407c942a2c74b7f5709fe915ee73d` | `08ef7ebf97d6e2d3524103f462ddef94e8aff53421acf9734e766323037cb5f7` | `209224d763836838ec4f4404f3f2590cf9ed62ef0ea9d636be8cadd3436a073b` |
| 27 | 让AI整理资料时，我最怕它把什么删掉？ | `content/writing/27.md` | `6e97c07c497f5271efcc763870bbe2cf6da9ff0ac4a61251bed00249b5d563f4` | `834217a35c7b87c69c565f4b0ea9c483eeb807fab88263b7f8ae76fda4a47537` | `6f70a18106b63f16c181d6185c936d964923154f8d8070316882d391e064ddde` |
| 28 | 看懂了答案，和自己做出来差在哪里？ | `content/writing/28.md` | `ae7f7b2e6033bbadba7814118fa59ddaa4688bde16444a81c8fe0c65f48838af` | `a9cf8680f1154ae5c100b0dbc0243be2dd11b22b984cb852c3fa1642335c3ac7` | `dcfd5b2372bef119e911fa890b8ceb55ee829df5e98a8ca0fd905a79d4eed9f9` |
| 29 | 让AI和我学同一门课，会发生什么？ | `content/writing/29.md` | `7fa5c37ec63e733536081cff0a12d7ba2bedafe80d9feebf14ca9e8cd565daae` | `da7b41b8114ea29a504c68905778e4532c4299d1d59cfbf1cb12ffd8fb6d4563` | `e8af213d3aa9ab15a4479a8b84e81d99498fd8b2e9dc261f3e074cb335e95a9f` |
| 30 | 测试通过了，究竟证明谁学会了？ | `content/writing/30.md` | `c9ad8e97477c8e540b4e55c22df1cee01bfef15ff3a31e4ccd110593897641bf` | `848966febe3968b137f97f84f17865602778019a4a605b7fca2ca3c69e36d99b` | `ec454b7c2432243ae21ab73e9696ee02bfc2ea806b62b02919364d52d1774c91` |
| 31 | 为了不浪费额度，我开始反过来找事情做 | `content/writing/31.md` | `6b3252daebdc7cca9428954aafe8e8b5ac33435b375c5b4e6738b00e3d1ad661` | `a5d85e504857ca156aac6e8be8de32726b924a8f746b65379d08640a9463e6b7` | `4fd5fad5db07c297940e0933f209eff3a233843140b78512b28bff0a1b44d731` |
| 32 | “看起来很未来”的项目，为什么后来被我放下？ | `content/writing/32.md` | `5a9ff05b2f9b144a072727da20b1fb9988fbb98787552b150c0217902ed6d889` | `d1f731fdf05e6491ca516dc1ab90e1e2f4e3e22cd731b7f3b217281b521b3517` | `e1d8731b9cf422e458a23d3fb732ce400241e67bb4cf60c0b072f4bdada2ae49` |
| 33 | 只看前端截图，能判断一个AI好不好吗？ | `content/writing/33.md` | `041cfe07ae7221bdc9da00c79910218662f8336b5ada50594381a12bfdb25777` | `797898a8285effe3c8f8a35a468d0619894d5d8d25425e3d8195d94496456a6c` | `29088bd7d1f69721f893c1c775ee2b3423a8b56698a67a6b072528a9d2d6eb13` |
| 34 | 会用很多AI工具，我就有解决问题的能力了吗？ | `content/writing/34.md` | `49d39de914ed814d33d8ba954e076a8c8ee386ebc3e7c346df1499e1924ca86e` | `39bb7d19c78b7f4f025abb13c89dae0aea71a1f56268f3cfe0a52ca082d9334d` | `bcfa793942554006d5e54e506b7f7acf53377bc4c59e8519e87770679bef3f1e` |
| 35 | 一个项目值得做，应该先回答哪些问题？ | `content/writing/35.md` | `45fcfa11a65393ce56d3fdc9c6032defcfd2008e36ec518dacb1b5bc277e6eb4` | `012d6bacf13900f41c4285551bade6eb999d5de2580120c27372e5afd6ae201c` | `5018645befb4e3641f2850350a5bf65c93d96275ee00ee900bb2a9aea194bd51` |
| 36 | 我的个人网站，为什么越改越想做减法？ | `content/writing/36.md` | `027955a18e5bf62518d7b7007490d559fc04d5f2b5db3288cd5102b2187c51ca` | `030c29dc45fab53642a34a5e96b384f7ce4939a5f59a9774cd97454ab6488fe7` | `071589d0c50a96134836fd3c428819a0f75b3c14c965bfc001b2f0b7ea7502bd` |
| 37 | 同一篇文章，为什么要有两种读法？ | `content/writing/37.md` | `7e13821bf1247d707ca02a8cbe1ed0b0e22d770ebd369a6ca1c4da90b6ce788a` | `a66fa82e515b4a51d544dbd22076b53564db65d909c268e45d3bc478b6357889` | `dabd00541a221a74b219ebaabe480b41497f43180da3c30feefcedbab23e71ca` |
| 38 | 我为什么想做自己的Dream-RSI？ | `content/writing/38.md` | `c672566e6f854303805fc37227fa5da7948cb81c133d06766889c3e5c23462af` | `cbb15ed42e0a82e935454d3d8508a71fcb9926c5351fcc946d7142bead57f3f5` | `8e4d60caab35a3451ee8a7f03d189f0396b4a020110e468214013f85528f682d` |
| 39 | 复现论文时，我为什么改回了熟悉的Codex对话？ | `content/writing/39.md` | `38a7a6a4d4cd532d10d777b235337b4054f44fc464b85581e92bdba5d6f60a36` | `f34f90b3b64fd854fd51b9b1c62e59a04550ca0f20e2b2a1b20099a9c2200a81` | `dc7069fda12baa63b12bf48e0108b18b428b4f2c10b0207ee8b7af9c2b85cb4e` |
| 40 | 两次实验都没触发“Dream”，这个结果有价值吗？ | `content/writing/40.md` | `21f1eb0d4dda52e120882779cd03ff8f046bc3ebe6dbc78cf1b97982bc519e4d` | `ed666ba1fdbd35a951845459a2277699764abcdfd1a1e702d1f9a5e47b027f82` | `4b90a6e87b44c672ef0014a19f864b8fe22fe80ded8c637370483a9477ac238a` |
| 41 | 我开始用benchmark，检查AI到底有没有帮上忙 | `content/writing/41.md` | `73a02f07e3137f800cd1f09fe8d44ce4fc0496c05f2b1a2adcf345ef30897ecc` | `61f1bd413225138bae51f3746f557385f73b9222f3f6752f5a59986bfd4eec3a` | `ca88edb5ed6469ec81d4c617a44516a821adcafe80887362177e7c9fbac2481c` |
