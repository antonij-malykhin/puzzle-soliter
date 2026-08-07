import { _decorator, Component, Node, Prefab, instantiate, UITransform, Layout, Vec2, Size } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LevelGridManager')
export class LevelGridManager extends Component {
    @property
    public cols: number = 5;

    @property
    public rows: number = 5;

    @property
    public spacingX: number = 10;

    @property
    public spacingY: number = 10;

    // Пропорция карточки (Высота / Ширина)
    // На скриншоте карточки примерно 1:1.4
    @property
    public cardAspectRatio: number = 1.35;

    private layout: Layout | null = null;
    private uiTransform: UITransform = null!;

    onLoad() {
        this.layout = this.getComponent(Layout) || this.addComponent(Layout);
        this.uiTransform = this.getComponent(UITransform)!;

        // Подписываемся на изменение размера экрана/контейнера
        this.node.on(Node.EventType.TRANSFORM_CHANGED, this.recalculateGrid, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TRANSFORM_CHANGED, this.recalculateGrid, this);
    }

    public initGrid(spacingX: number, spacingY: number, cols: number, rows: number) {
        this.spacingX = spacingX;
        this.spacingY = spacingY;
        this.cols = cols;
        this.rows = rows;
        this.recalculateGrid();
    }

    public recalculateGrid() {
        if (!this.uiTransform || !this.layout) return;

        // Получаем доступные размеры контейнера
        const containerWidth = this.uiTransform.width;
        const containerHeight = this.uiTransform.height;

        // Расчет доступной ширины/высоты с учетом отступов
        const totalSpacingX = this.spacingX * (this.cols - 1);
        const totalSpacingY = this.spacingY * (this.rows - 1);

        const availableWidth = containerWidth - totalSpacingX;
        const availableHeight = containerHeight - totalSpacingY;

        // Вычисляем максимально возможную ширину одной карточки по X и по Y
        let cardWidth = availableWidth / this.cols;
        let cardHeight = cardWidth * this.cardAspectRatio;

        // Если по высоте сетка не влезает в контейнер — пересчитываем от высоты
        if (cardHeight * this.rows > availableHeight) {
            cardHeight = availableHeight / this.rows;
            cardWidth = cardHeight / this.cardAspectRatio;
        }

        // Настраиваем компонент Layout
        this.layout.type = Layout.Type.GRID;
        this.layout.resizeMode = Layout.ResizeMode.CHILDREN;
        this.layout.cellSize = new Size(cardWidth, cardHeight);
        this.layout.spacingX = this.spacingX;
        this.layout.spacingY = this.spacingY;

        // Выравнивание по центру
        this.layout.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
        this.layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;

        // Принудительное обновление Layout
        this.layout.updateLayout();
    }
}