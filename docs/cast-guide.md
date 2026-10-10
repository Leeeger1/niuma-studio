# 角色立绘：换成你自己的动漫角色

牛马工作室**自带一套立绘**：傻妞和 8 个岗位，每人「平时」「开心」「出错」三张（在 `public/cast/sakura/`）。皮肤栏右边的「人物」开关能换成代码画的动漫风或 Q 版。

想换成你自己的角色（画师画的，或者 AI 绘图生成的），就在皮肤里放上你的立绘，自带的那套会被替换掉。换上以后：

- 坐在工位上露上半身，开会、送任务单、拿电棍走过去时露全身；
- 打字时轻轻晃、做完一跳一跳、想事情时歪歪头，出错冒冷汗、挨电棍闪黄光照样有；
- 聊天和项目组卡片里的头像，自动从立绘上截脸；
- 再给一张「开心」和一张「出错」的话，做完、出错时会换成那张表情。

## 三种弄法

### 一、软件里一键让 AI 画（最省事）

要先在「接入员工」里接一个**带画图模型**的接口，一般是中转站（gpt-image-1、dall-e-3、flux、seedream、cogview 这类都行）。

1. 点皮肤栏的「＋ 做皮肤」（或者在已经做好的皮肤上点「✎ 改皮肤」），往下拉到「角色立绘」。
2. 「用哪个接口画」选你的中转站，点「读取画图模型」，在「画图模型」里选一个。
3. 点「**一键画全部**」：傻妞、架构师、前端、审查员、后端、测试、排错、文档专员、其他人，一人一张。想连表情一起画就勾上「连『开心』『出错』两张表情一起画」（时间和花费是 3 倍）。
4. 画出来的图会自动去掉白底、裁好边，后面的办公室马上就能看到。哪张不满意，点那一行的「AI 画」重画，或者点格子换成自己的图。
5. 满意了点「保存」。

提示词是按每个角色现在的样子写的：发型、发色、配饰（安全帽、贝雷帽、眼镜……）、衣服颜色跟所在项目组走，所以画出来的人和原来的设定对得上。

### 二、复制提示词，去 AI 绘图工具里画

不想用中转站，或者想要更好的效果，可以用即梦、豆包、通义万相、可灵、Midjourney、NovelAI、Stable Diffusion 这些工具：

1. 在「角色立绘」里点某个角色的「**复制提示词**」（下面也列了全部）。
2. 粘贴到 AI 绘图工具里，比例选**竖图**（2:3 或 9:16），画一张**全身站立**的图。
3. 挑一张满意的下载下来，回到软件里点那个角色的「平时」格子传上去。白底会自动去掉（勾着「传图时自动去掉白底、裁掉空白边」就行）。

**让一整套画风统一的小窍门**：
- 同一个工具、同一个风格设置画完所有人；Midjourney 可以加同一个 `--sref`（风格参考）或 `--seed`。
- 工具支持「参考图」的话，把第一张满意的立绘当参考图，再画其他人。
- 表情图在提示词里把动作换掉就行：开心用「双手举高欢呼，开心地大笑，眯着眼睛」，出错用「慌张，冒冷汗，眼泪汪汪，双手抱头，搞笑的震惊表情」。

### 三、自己画，或者找画师

要求和 AI 图一样：一个人一张**全身站立**的竖图，**白底或透明底**，人物居中、别带背景和文字。png、jpg、webp 都行，太大的图会自动缩小。

## 图片要求和小贴士

- **全身图**（细长的）坐在工位上露上半身；**半身图**也能用，开会走路时会像视觉小说那样整个浮着。
- 白底会从图的四条边往里自动去掉，被线稿围住的白衬衫不会被抠掉。不过头发缝、手臂和身体之间那种**被围起来的小块白底**也会留着，换成深色皮肤能看出来；在意的话先用即梦、remove.bg、手机相册的「抠图」处理成透明底再传（自带那套就是用专门给动漫人物抠图的模型处理过的）。
- 三张表情不用画得一样大：软件会量每张图里人物的头顶到脚底，按身高对齐，举过头顶的手不算。
- 头像是从立绘最上面截的，所以别让手或者道具举得比头还高（「开心」那张举手没关系，头像只用「平时」那张）。
- 不要用别人有版权的角色（比如动画里的人物）当立绘去分享。

## 存在哪、怎么分享

- 立绘跟着皮肤走，存在皮肤文件夹里（`~/.niuma/skins/皮肤名/`），文件叫 `cast-角色-表情.webp`，`skin.json` 里的 `cast` 一段记着哪张是谁的。
- 「导出文件」会把立绘一起打包进皮肤文件，发给朋友，对方「导入文件」就是一整套。
- 想手写的话，`cast` 长这样（角色名见下面的提示词标题，`default` 是其他所有人，也可以写员工的 id 单独给某个人一张）：

```jsonc
"cast": {
  "shaniu": { "idle": "shaniu.png", "happy": "shaniu-happy.png", "error": "shaniu-cry.png" },
  "architect": "architect.png",
  "default": "everyone-else.png"
}
```

## 每个角色的提示词

这些是按默认编制写的（项目组变了，衣服颜色会跟着变，软件里「复制提示词」复制的是最新的）。

### 傻妞（`shaniu`）

中文：

```
一位动漫少女，黑色长直发，粉色眼睛，戴粉色发箍，两侧有机器人小天线，穿粉色水手服、红色领结、粉色百褶裙，开朗可爱的少女总管，抱着平板电脑，元气地微笑，日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人
```

英文：

```
1girl, black long straight hair, pink eyes, pink headband with small robot antenna sensors on both sides, pink sailor school uniform with red ribbon, pink pleated skirt, cheerful cute girl manager hugging a tablet, energetic smile, anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character
```

### 架构师（`architect`）

中文：

```
一位动漫少年，棕色利落短发，棕色眼睛，戴黄色安全帽，穿橙色西装外套、白衬衫、领带、深色西裤，胸前别着工牌，自信，腋下夹着一卷蓝图，日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人
```

英文：

```
1boy, young man, brown short neat hair, brown eyes, wearing a yellow construction safety helmet, orange business blazer, white shirt, necktie, dark trousers, name badge, confident, holding a rolled blueprint under the arm, anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character
```

### 前端工程师（`frontend`）

中文：

```
一位动漫少女，棕色双马尾，蓝色眼睛，戴红色贝雷帽，穿橙色西装外套、白衬衫、领结、深色百褶裙，胸前别着工牌，活泼，拿着数位笔和平板，日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人
```

英文：

```
1girl, brown twin tails, blue eyes, wearing a red beret, orange business blazer, white shirt, ribbon bow, dark pleated skirt, name badge, lively, holding a stylus and a drawing tablet, anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character
```

### 代码审查员（`reviewer`）

中文：

```
一位动漫少年，黑色斜刘海短发，蓝色眼睛，戴细框眼镜，穿橙色西装外套、白衬衫、领带、深色西裤，胸前别着工牌，冷静认真，拿着写字板，日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人
```

英文：

```
1boy, young man, black short hair with side-swept bangs, blue eyes, wearing thin-framed glasses, orange business blazer, white shirt, necktie, dark trousers, name badge, calm and serious, holding a clipboard, anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character
```

### 后端工程师（`backend`）

中文：

```
一位动漫少女，浅粉色齐耳短发（波波头），紫色眼睛，戴头戴式耳机，穿深青绿色西装外套、白衬衫、领结、深色百褶裙，胸前别着工牌，专注，抱着笔记本电脑，日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人
```

英文：

```
1girl, light pink bob cut, purple eyes, wearing over-ear headphones, dark teal business blazer, white shirt, ribbon bow, dark pleated skirt, name badge, focused, holding a laptop, anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character
```

### 测试工程师（`tester`）

中文：

```
一位动漫少女，金色高马尾，青绿色眼睛，戴棒球帽，穿深青绿色西装外套、白衬衫、领结、深色百褶裙，胸前别着工牌，精神满满，拿着放大镜，日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人
```

英文：

```
1girl, blonde high ponytail, teal eyes, wearing a baseball cap, dark teal business blazer, white shirt, ribbon bow, dark pleated skirt, name badge, energetic, holding a magnifying glass, anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character
```

### 排错专家（`debugger`）

中文：

```
一位动漫少年，青绿色炸毛刺猬头，橙色眼睛，额头系红色头带，穿深青绿色西装外套、白衬衫、领带、深色西裤，胸前别着工牌，坚定，拿着扳手，日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人
```

英文：

```
1boy, young man, teal spiky messy hair, orange eyes, wearing a red bandana headband, dark teal business blazer, white shirt, necktie, dark trousers, name badge, determined, holding a wrench, anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character
```

### 文档专员（`writer`）

中文：

```
一位动漫少女，蓝色齐耳短发（波波头），粉色眼睛，头顶扎丸子头，穿蓝色西装外套、白衬衫、领结、深色百褶裙，胸前别着工牌，温柔，拿着笔记本和钢笔，日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人
```

英文：

```
1girl, blue bob cut, pink eyes, hair tied in a bun on top, blue business blazer, white shirt, ribbon bow, dark pleated skirt, name badge, gentle, holding a notebook and a pen, anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character
```

### 其他人（通才、新招的）（`default`）

中文：

```
一位动漫少女，金色长直发，蓝色眼睛，穿蓝色西装外套、白衬衫、领结、深色百褶裙，胸前别着工牌，友善，双手自然下垂，日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人
```

英文：

```
1girl, blonde long straight hair, blue eyes, blue business blazer, white shirt, ribbon bow, dark pleated skirt, name badge, friendly, relaxed pose, anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character
```
