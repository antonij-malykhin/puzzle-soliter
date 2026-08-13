# Фича «Collections» (коллекция картинок) — план разработки

Резюме для продолжения разработки в новом чате. Проект: Cocos Creator 3.8.6, TypeScript, Yandex Games.

## 1. Суть фичи
- После победы в уровне собранная картинка доступна игроку на экране `Collections` в лобби.
- Экран — скролл-лента ячеек картинок (2 колонки).
- Непройденные картинки видны, но с другой обводкой / цветом и спрайтом замка, некликабельны.
- Клик по картинке открывает её в полном размере.
- Ячейки региона (бонус) отображаются в другой рамке (другой префаб).

## 2. Принятые решения
- Лента = только **текущий регион**: 25 ячеек уровней (`CommonLevelImage` prefab) + 1 ячейка региона (`RegionLevelImage` prefab) **последней**.
- Заблокированные ячейки участвуют в ленте, номер подписи остаётся как у пройденных; некликабельны (`Button.interactable=false`).
- Полный размер по клику = **слайс ячейки уровня** (с сохранением пропорций); у ячейки региона — вся region-картинка.
- Регион-ячейка разблокируется, когда пройдены все 25 уровней региона.
- **Сцену (`lobby.scene`), `.meta` и префабы НЕ редактировать кодом** — привязку в редакторе делает разработчик.

## 3. Уже есть в проекте (не создавать заново)
- Сцена `lobby.scene`, узел `Collections` (id 335, последний дочерний Canvas): `RootCollections` (336) = `Background` + `ScrollView` (341) + `CloseButton` (418); `RootFullImage` (425, `active=false`) = `Background` + `FullImageSprite` (430) + `CloseFullImageButton` (434).
- Контент `content` (351): `cc.Layout` GRID, `FIXED_COL` (`constraintNum=2`), `resizeMode=CONTAINER`, `cellSize` 40×40 (требует переопределения в коде на 325×650), в редакторе внутри 6 префаб-инстансов-заглушек.
- Префабы:
  - `CommonLevelImage.prefab` (uuid `63803f06-bea6-4ff2-a164-9c1ac061bbe2`)
  - `RegionLevelImage.prefab` (uuid `6a8cfc88-5a82-4561-9fff-8a8edea5716a`)
  - Структура одинаковая: `Mask/ImageSprite`, `Border`, `LockSprite`, `LevelLabel`.
- Кнопка `CollectionButton` (узел 49) в `BottomPanel` лобби. `clickEvents` не настроены — подписку делает код.
- Спрайты (из `assets/sprites/`):
  - `collection-boarder.webp` — обычная unlocked-рамка (уже в префабе Common).
  - `collection-boarder-lock.webp` (uuid `7385a1c5-78d9-4df6-a291-de233550ee30`) — locked-рамка обычной.
  - `collection-border-region.webp` — unlocked-рамка региона (уже в префабе Region).
  - `collection-border-region-lock.webp` (uuid `8b6aa85e-d58e-4e7e-9b1b-19b3de04fe21`) — locked-рамка региона.
  - `lock-icon.png` — спрайт замка (уже в префабах как `LockSprite`).
- Данные/сервисы (из `ServiceContainer`):
  - `LevelService.getLevelCatalog(regionNumber)` → `LevelCatalogData { regionImageId, cols, rows, spacingX, spacingY, levels[] }`; уровни уже отсортированы по `gridY, gridX`.
  - `ImageService.getImage(imageId)` → `SpriteFrame` (кэш).
  - `SpriteFrameSliceService.sliceGridCell({ sourceSpriteFrame, gridWidth, gridHeight, cellX, cellY })` → слайс (кэшируется, синхронный).
  - `ProgressionManager.isCompleted(levelId)`, `getCurrentRegionNumber()`, `isCurrentRegionCompleted()`.
  - `LocalizationManager.t(key, { number })`.

## 4. Файлы, которые нужно создать/изменить (только код)

### 4.1 `assets/scripts/Data/Models/CollectionImagePresentation.ts` (новый)
Интерфейс без cc-зависимостей (`import type { SpriteFrame } from 'cc'`):
```ts
export interface CollectionImagePresentation {
    cellId: string;
    isRegion: boolean;
    spriteFrame: SpriteFrame | null;
    isCompleted: boolean; // разблокирована (пройден уровень / весь регион)
    levelNumber: number | null;
    label: string;
}
```

### 4.2 `assets/scripts/UI/Screens/CollectionLevelCellUI.ts` (новый)
`@ccclass('CollectionLevelCellUI') extends Component`. Вешается на корень обоих префабов. Все ссылки — инспекторные `@property`:
- `Sprite imageSprite` — `Mask/ImageSprite`
- `Sprite borderSprite` — `Border`
- `Sprite lockSprite` — `LockSprite`
- `Label levelLabel` — `LevelLabel`

Метод `render(item: CollectionImagePresentation, lockedBorder: SpriteFrame)`:
- `imageSprite.spriteFrame = item.spriteFrame`.
- `levelLabel.string = item.label` — всегда (номер и у пройденных, и у лока одинаковый).
- `isCompleted` → оставить unlocked-рамку префаба, `lockSprite.node.active=false`, цвет картинки белый.
- иначе → `borderSprite.spriteFrame = lockedBorder`, `lockSprite.node.active=true`, `imageSprite.color = Color(150,150,150,255)`.

### 4.3 `assets/scripts/UI/Screens/CollectionUI.ts` (новый)
`@ccclass('CollectionUI') extends Component` на узел `Collections`. Самодостаточный (паттерн `SettingsUI`/`ShopUI`), сервисы из `ServiceContainer`.

Инспекторные `@property`:
- `Node rootCollections` (336), `Node fullScreenRoot` (425), `Node content` (351)
- `ScrollView scrollView` (341)
- `Button collectionButton` (49), `Button closeButton` (418), `Button closeFullImageButton` (434)
- `Sprite fullImageSprite` (430)
- `Prefab commonLevelImagePrefab`, `Prefab regionLevelImagePrefab`
- `SpriteFrame commonLockedBorder`, `SpriteFrame regionLockedBorder`

Логика:
- `onLoad()`: подписать 3 кнопки; `this.node.active = false` (скрыть при старте).
  - **Важно:** узел `Collections` в редакторе должен оставаться активным, иначе `onLoad` не сработает и не повесится обработчик на `CollectionButton`.
- `open()`: `await this.populate()`; `scrollView.scrollToTop(0)`; `node.active=true`, `rootCollections.active=true`, `fullScreenRoot.active=false`.
- `populate()`:
  - `content.removeAllChildren()`.
  - Настроить `Layout` на `content`: `cellSize = new Size(325, 650)`, `constraintNum = 2`, `spacingX=0`, `spacingY=0` (в сцене стоит 40×40 — заглушка).
  - `regionNumber = progressionManager.getCurrentRegionNumber()`; `catalog = levelService.getLevelCatalog(regionNumber)`; `regionImage = imageService.getImage(catalog.regionImageId)`.
  - Для каждого level: `sliceGridCell({ source: regionImage, gridWidth: cols, gridHeight: rows, cellX: gridX-1, cellY: gridY-1 })` → ячейка `CommonLevelImage`; `isCompleted = progressionManager.isCompleted(levelId)`; `label = String(levelNumber)`.
  - В конец: ячейка `RegionLevelImage`; `spriteFrame = regionImage`; `isCompleted = progressionManager.isCurrentRegionCompleted()`; `label = localization.t('collectionRegionLabel', { number: catalog.levels.length })`; `isRegion = true`.
  - Для каждой ячейки: `instantiate` + `setParent(content)` + `getComponent(CollectionLevelCellUI)?.render(item, lockedBorder)` (lockedBorder = `commonLockedBorder` или `regionLockedBorder` по `isRegion`); `addComponent(Button)` (transition NONE, `_target` = узел; у узла есть UITransform → кликабельна); если `isCompleted` → `interactable=true`, `CLICK` → `openFullImage(item.spriteFrame)`; иначе `interactable=false`.
- `openFullImage(spriteFrame)`:
  - `fullImageSprite.spriteFrame = spriteFrame`; пересчитать `UITransform.contentSize` под пропорции картинки и вписать в пространство (~1040×2300 за вычетом отступов, сохранить aspect ratio).
  - `rootCollections.active=false`, `fullScreenRoot.active=true`.
- Закрытие: `closeButton` → скрыть `rootCollections/node`; `closeFullImageButton` → `fullScreenRoot.active=false`, `rootCollections.active=true`.

### 4.4 `assets/scripts/Managers/LocalizationManager.ts` (правка)
Добавить ключ `collectionRegionLabel`: en `'Bonus {number}'`, ru `'Бонус {number}'`.

## 5. Что настраивает разработчик в редакторе (вне кода)
- Импортировать новые `.ts` (редактор сгенерирует `.meta`).
- `CollectionUI` → на узел `Collections` (335) в `lobby.scene`; привязать `rootCollections`, `scrollView`, `content`, `collectionButton` (узел 49), `closeButton` (418), `fullScreenRoot` (425), `fullImageSprite` (430), `closeFullImageButton` (434), `commonLevelImagePrefab`, `regionLevelImagePrefab`, `commonLockedBorder` (`collection-boarder-lock.webp`), `regionLockedBorder` (`collection-border-region-lock.webp`).
- `CollectionLevelCellUI` → на корень префабов `CommonLevelImage` и `RegionLevelImage`; привязать `imageSprite`/`borderSprite`/`lockSprite`/`levelLabel`.
- Узел `Collections` оставить активным (код скроет при старте).
- `content`/`Layout` в сцене менять не нужно.

## 6. Проверка
- `npx tsc -p tsconfig.json --noEmit` (если есть `temp/tsconfig.cocos.json`).
- В редакторе: запуск `lobby` → коллекции скрыты → клик `CollectionButton` → 25 ячеек уровней + бонус-ячейка региона последней; лока — серая рамка + замок + некликабельны; пройденные — обычная рамка; клик по пройденной открывает полноэкранный слайс; оба крестика закрывают. Прогресс берётся из `ProgressionManager` (после победы уровень становится доступным).

## 7. Границы / не трогать
- Не редактировать `lobby.scene`, любые `.meta`, `.prefab`.
- Не менять `LobbyEntryPoint` / `LobbyController` / `LobbyUI` (CollectionUI самодостаточен).
- Внутренние узлы префабов ищутся инспекторными ссылками (не по имени), т.к. привязку делает разработчик.