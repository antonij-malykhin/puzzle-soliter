# Mosaic Puzzle Architecture

**Версия:** 1.0 | **Движок:** Cocos Creator 3.8+ | **Язык:** TypeScript

## Цели и Принципы
*   **Цели:** Легкое расширение, независимость систем, мобильная поддержка, генерация и редактор уровней.
*   **Принципы:** SOLID, DRY, KISS, композиция (composition over inheritance), Event Driven Architecture.
*   **Запрещено:** God Object, циклические зависимости, хранение состояния в нескольких местах.

## Иерархия и Цикл
**Схема:** Application → GameManager → PuzzleManager → PuzzleBoard → PuzzlePiece → PuzzleCell.
**Игровой цикл:** Инициализация → загрузка настроек → загрузка уровня → генерация деталей → создание поля → игра → проверка победы → сохранение → следующий уровень.

## Менеджеры (Независимые модули)
*   **GameManager:** Управляет состоянием (start, pause, resume, finish, restart).
*   **PuzzleManager:** Отвечает за логику пазла, создание Board/Pieces, валидацию, отслеживание победы.
*   **SaveManager:** JSON-сериализация для Progress, Settings, Gallery, Statistics.
*   **AudioManager:** Музыка, SFX, громкость, Mute.
*   **SceneManager:** Загрузка сцен, переходы, предзагрузка.
*   **SettingsManager:** Язык, громкость, вибрация, подсказки.

## Игровые Сущности и Генерация
*   **PuzzleBoard:** Хранит Grid, PuzzleCells, PieceContainer. Не содержит логики.
*   **PuzzlePiece:** Хранит id, Shape (координаты), Sprite, Target/Current Position, Rotation, Placed, Locked. Не знает о других деталях.
*   **PuzzleCell:** Координаты, индекс, ссылка на владельца.
*   **Shape:** Массив координат (например, `[(0,0), (1,0), (2,0)]`). Не зависит от графики.
*   **Renderer:** Отдельная система для нарезки текстуры, маски и обводки.
*   **Generator (Алгоритм заполнения):** Разбить сетку → создать пустое поле → выбрать случайную клетку → построить Polyomino (макс. 8 клеток, макс. длина 4) → проверить ограничения → повторять до заполнения → создать текстуры → перемешать. Запрещены длинные полосы и сложные фигуры.

## Логика и События
*   **Система установки:** Игрок отпускает деталь → SnapSystem (автопритягивание) → Validator (позиция, вращение, форма) → анимация → Lock → VictoryCheck.
*   **EventBus:** События: `GameStarted`, `LevelLoaded`, `PiecePicked`, `PiecePlaced`, `PieceRotated`, `PuzzleCompleted`, `SettingsChanged`. UI подписывается на события, напрямую логику не трогает.

## UI, Камера и Производительность
*   **UI:** Каждое окно состоит из View + Controller + Animation.
*   **Камера:** Zoom, Pan, Focus, Reset (не зависит от доски).
*   **Пулы:** NodePool для деталей, эффектов, окон, подсказок.
*   **Производительность:** Запрещены `find()`, `getComponent()` в кадре, `Resources.load()` в игре. Использовать Tween, кэширование, Lazy initialization.