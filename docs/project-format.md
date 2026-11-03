# 户型文件格式（版本 1）

项目有两种 JSON 文件，分别用于继续编辑和 HA 展示。两者并不互换：编辑器的“导入项目”读取项目备份；HA 卡片读取带格式标识的户型数据。建议使用界面导出文件，手工修改前先备份。

## 项目备份

“导出项目”生成一个 `Project` 对象。它可能包含参考底图，属于需要妥善保管的个人数据。导入文件上限为 20 MiB。以下是没有底图的最小示例：

```json
{
  "version": 1,
  "name": "示例户型",
  "cmPerUnit": null,
  "background": null,
  "walls": [],
  "openings": [],
  "rooms": [],
  "furniture": [],
  "markers": []
}
```

`background` 为 `null` 或 PNG/JPEG 的 base64 data URL；导入校验限制字符串长度不超过 7,000,000 字符。`cmPerUnit` 为每个画布单位对应的厘米数，范围 0.05～20；`null` 表示未校准，此时按每单位 1 厘米生成示意结果。坐标以画布左上为原点，向右为 `x` 正方向、向下为 `y` 正方向；允许对象位于初始画布范围之外。

对象字段如下；未特别说明时，尺寸和离地高度单位为厘米，坐标使用画布单位：

| 数组 | 主要字段 |
| --- | --- |
| `walls` | `id`、中心线端点 `start` / `end`、`thickness`、`height`；可选颜色 `color` 和光泽 `finish`。 |
| `openings` | `id`、所属墙体 `wallId`、`kind`（`door` / `window`）、`center`（从墙起点到终点的比例，0～1）、`width`、窗台或底部高度 `sill`、`height`；门可选 `swing`。 |
| `rooms` | `id`、`name`、不自交的 `points` 多边形、`color`；可选地面样式 `floorStyle`（`solid` / `wood` / `tile`）。 |
| `furniture` | `id`、`kind`、中心点 `position`、`width`、`depth`、`height`、`rotation`（角度）；可选 `color`。 |
| `markers` | `id`、`name`、`kind`、`position`；可选 `height`、`roomId`、`icon`。未设置高度时按墙体上方的默认高度展示。 |

点格式为 `{"x": 100, "y": 100}`。颜色使用六位十六进制格式，例如 `#e8dfcf`。房间点数为 3～200，顶点不要重复闭合；门窗必须引用存在的墙。所有对象的 `id` 在整个项目内都必须非空且唯一。设备的 `roomId` 可以为空或缺失；如果引用的房间不存在，编辑器的户型检查会提示。完整枚举及校验以当前版本源码 `src/domain/project.ts` 为准。

## HA 户型数据与安装包

“导出 HA 户型”生成如下结构，`project` 使用上述对象，但 `background` 必须为 `null`：

```json
{
  "format": "home-floor-studio",
  "version": 1,
  "project": {
    "version": 1,
    "name": "示例户型",
    "cmPerUnit": null,
    "background": null,
    "walls": [],
    "openings": [],
    "rooms": [],
    "furniture": [],
    "markers": []
  }
}
```

“导出 HA 安装包”生成 ZIP，包含 `www/home-floor-studio/home-floor-ha.json`、配套卡片脚本、使用说明及许可文件。卡片要求包装层的 `format` 和 `version` 与上述值一致，并校验内部项目。当前仅支持版本 1；不要假定未来版本可直接被旧卡片读取。安装包不包含参考底图或 AI 密钥，但户型、设备名称及位置仍可能包含个人信息。

HA 实体绑定和点击行为保存在 HA 卡片配置中，不在户型数据中。更新户型时保留设备标记的 `id`，原有绑定才有对应对象；删除后重新创建的标记需要重新绑定。安装与更新步骤见 [HA 平面图卡片](ha-preview.md)。

## 完整项目 ZIP

右侧“项目”面板中的“导出完整项目包”会把一次导出所需的主要文件放在同一 ZIP 中：

| 路径 | 内容 |
| --- | --- |
| `project/home-floor-studio.json` | 可重新导入编辑器的项目备份，可能包含原始参考底图。 |
| `2d/home-floor-studio.svg`、`2d/home-floor-studio.png` | 当前导出设置生成的 2D 成图；PNG 分辨率遵循界面选择。 |
| `3d/home-floor-studio.glb` | 当前户型的简化 GLB 模型，尺寸单位为米。 |
| `home-assistant/home-floor-studio-ha.zip` | 含户型数据、卡片、许可及安装说明的独立 HA 安装包。 |
| `README.txt` | 解压、恢复项目及安装 HA 包的步骤和数据提示。 |

导回编辑器时，先解压完整项目 ZIP，再通过“导入项目”选择其中的 JSON；其他文件不能代替项目备份。AI 密钥不会写入项目文件或该 ZIP。项目备份可能包含户型图片、房间名称和设备标记，请按敏感资料妥善保管。完整项目 ZIP 的格式独立于内部项目 JSON 和 HA 数据格式，当前不承诺跨版本兼容；重要项目请保留原始 JSON 备份。
