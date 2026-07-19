import { Color, Node, Sprite, UITransform, Vec3 } from 'cc';
import { ImageService } from '../Services/ImageService';

const DEFAULT_IMAGE_ALPHA = 255;
const HIDDEN_IMAGE_ALPHA = 0;

/**
 * ImageBoardRenderer
 * 
 * Renders the puzzle image as a background layer beneath the game board grid.
 * Loads the image via ImageService and positions it to match board dimensions.
 * 
 * Responsibilities:
 * - Load SpriteFrame for the puzzle image from ImageService
 * - Create/update Sprite node with appropriate scaling
 * - Position image to align with board grid
 * - Handle image loading lifecycle
 * 
 * Note: This is a utility class (not a Component) to support manual instantiation
 * and DI injection of ImageService.
 */
export class ImageBoardRenderer {
    private imageNode: Node | null = null;
    private spriteComponent: Sprite | null = null;

    public constructor(private readonly imageService: ImageService) {}

    /** Called by PuzzleStage to render the image */
    public async render(
        imageId: string,
        parentNode: Node,
        boardOriginX: number,
        boardOriginY: number,
        boardWidth: number,
        boardHeight: number,
        hidden = false,
    ): Promise<void> {
        try {
            // Clean up existing image node if present
            this.cleanup();

            // Create new node for image
            this.imageNode = new Node(`ImageBoard_${imageId}`);
            parentNode.addChild(this.imageNode);

            // Add Sprite component
            this.spriteComponent = this.imageNode.addComponent(Sprite);

            // Set up UITransform for positioning and sizing
            const transform = this.imageNode.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(boardWidth, boardHeight);
                transform.setAnchorPoint(0.5, 0.5);
            }

            // Position to match board center.
            // z = -1 to render behind grid
            this.imageNode.setPosition(new Vec3(boardOriginX, boardOriginY, -1));

            // Load and assign sprite frame
            const spriteFrame = await this.imageService.getImage(imageId);
            if (spriteFrame && this.spriteComponent) {
                this.spriteComponent.spriteFrame = spriteFrame;
                this.spriteComponent.type = Sprite.Type.SIMPLE; // Use simple rendering for performance
                this.spriteComponent.color = new Color(
                    DEFAULT_IMAGE_ALPHA,
                    DEFAULT_IMAGE_ALPHA,
                    DEFAULT_IMAGE_ALPHA,
                    hidden ? HIDDEN_IMAGE_ALPHA : DEFAULT_IMAGE_ALPHA,
                );
            }
        } catch (error) {
            console.error(`[ImageBoardRenderer] Failed to render image ${imageId}:`, error);
        }
    }

    /** Clean up existing image node */
    public cleanup(): void {
        if (this.imageNode) {
            this.imageNode.destroy();
            this.imageNode = null;
            this.spriteComponent = null;
        }
    }
}
