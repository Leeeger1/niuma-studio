# 牛马工作室美术素材

本批已收录 63 / 263 张：最终包含角色 189 张、场景 21 张、道具 53 张。

使用内置 `image_gen.imagegen` 生成与编辑。工具未公开底层模型名称，因此逐文件如实标注“imagegen 内置（模型未公开）”，不推测具体型号。
最终素材为 WebP，质量 90；保留生成文件的透明通道。只进行格式转换和必要的等比尺寸/画布规范化，不修改任何软件代码。
完整提示词、参考图、生成次数和检查记录保存在 `asset-manifest.json`。

本批沿已有 `art` 分支追加提交，基于 `e65899a`。此前 `art/cast/*.png` 的 27 张素材完整保留，不计入本批 263 张；新角色放在 `art/cast/<套名>/`，场景和道具按主题分别存放。

## 自检未满意项

- `scenes/sakura/floor.webp`：原图仅缩到1024，WebP质量90。重画3次后保留最后版；板条间距略不均匀，生成器仍未保证像素级严格无缝，README应列作轻微不满意项。

## 文件清单

| 文件 | 使用模型 | 实际尺寸 | 背景透明 | 状态 | 重画次数 |
|---|---|---|---|---|---|
| `cast/sakura/shaniu-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/sakura/architect-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/sakura/frontend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/sakura/reviewer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/sakura/backend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/sakura/tester-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/sakura/debugger-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/sakura/writer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/sakura/default-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `scenes/sakura/wall.webp` | imagegen 内置（模型未公开） | 1024×1024 | 否（场景） | 已保存 | 0 |
| `scenes/sakura/floor.webp` | imagegen 内置（模型未公开） | 1024×1024 | 否（场景） | 已保存（问题见上） | 3 |
| `scenes/sakura/window.webp` | imagegen 内置（模型未公开） | 1536×1024 | 否（场景） | 已保存 | 0 |
| `props/sakura/desk.webp` | imagegen 内置（模型未公开） | 1024×1024 | 是 | 已保存 | 3 |
| `props/sakura/desk-boss.webp` | imagegen 内置（模型未公开） | 1024×1024 | 是 | 已保存 | 2 |
| `props/sakura/chair.webp` | imagegen 内置（模型未公开） | 1024×1024 | 是 | 已保存 | 0 |
| `props/sakura/monitor.webp` | imagegen 内置（模型未公开） | 1024×1024 | 是 | 已保存 | 0 |
| `props/sakura/plant.webp` | imagegen 内置（模型未公开） | 1024×1024 | 是 | 已保存 | 0 |
| `props/sakura/whiteboard.webp` | imagegen 内置（模型未公开） | 1024×1024 | 是 | 已保存 | 0 |
| `cast/q/shaniu-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/q/architect-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 1 |
| `cast/q/frontend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/q/reviewer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/q/backend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/q/tester-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/q/debugger-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/q/writer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/q/default-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/park/shaniu-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/park/architect-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/park/frontend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/park/reviewer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/park/backend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/park/tester-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/park/debugger-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/park/writer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/park/default-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/xianxia/shaniu-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/xianxia/architect-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/xianxia/frontend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/xianxia/reviewer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/xianxia/backend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/xianxia/tester-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/xianxia/debugger-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/xianxia/writer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/xianxia/default-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/space/shaniu-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/space/architect-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/space/frontend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/space/reviewer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/space/backend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/space/tester-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/space/debugger-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/space/writer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/space/default-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/neon/shaniu-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/neon/architect-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/neon/frontend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/neon/reviewer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/neon/backend-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/neon/tester-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/neon/debugger-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/neon/writer-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
| `cast/neon/default-idle.webp` | imagegen 内置（模型未公开） | 1024×1536 | 是 | 已保存 | 0 |
