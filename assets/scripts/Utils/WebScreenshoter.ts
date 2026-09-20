import { _decorator, Component, Camera, RenderTexture, view, gfx, director, Director } from 'cc';
import { EDITOR } from 'cc/env'; // Импортируем флаг редактора
const { ccclass, property } = _decorator;

@ccclass('WebScreenshoter')
export class WebScreenshoter extends Component {
    @property(Camera)
    mainCamera: Camera = null!;

    public takeScreenshot() {
        if (!this.mainCamera) {
            console.error("Камера не назначена!");
            return;
        }

        // 1. Определяем размеры в зависимости от того, запущено это в редакторе или в браузере
        let width = 0;
        let height = 0;

        if (EDITOR) {
            // В режиме редактора (Game View) берем размеры окна отображения напрямую
            width = Math.floor(view.getVisibleSize().width);
            height = Math.floor(view.getVisibleSize().height);
        } else {
            // В веб-браузере берем размеры игрового canvas
            const canvasElement = document.getElementById('GameCanvas') as HTMLCanvasElement;
            width = canvasElement ? canvasElement.width : Math.floor(view.getVisibleSize().width);
            height = canvasElement ? canvasElement.height : Math.floor(view.getVisibleSize().height);
        }

        if (width <= 0 || height <= 0) {
            width = 800; // Резервные дефолтные значения
            height = 600;
        }

        // 2. Создаем и инициализируем RenderTexture
        const renderTex = new RenderTexture();
        renderTex.initialize({
            width: width,
            height: height
        });

        // 3. Направляем рендер камеры в текстуру
        const originalTarget = this.mainCamera.targetTexture;
        this.mainCamera.targetTexture = renderTex;
        director.once(Director.EVENT_AFTER_RENDER, () => {
            const buffer = new ArrayBuffer(width * height * 4);
            const region = new gfx.BufferTextureCopy();
            region.texExtent.width = width;
            region.texExtent.height = height;
            // Используем стандартный, существующий во всех веб-платформах 3.8 метод
            director.root!.device.copyTextureToBuffers(
                renderTex.getGFXTexture()!,
                [new Uint8Array(buffer)],
                [region]
            );
            // Возвращаем камеру в исходное состояние
            this.mainCamera.targetTexture = originalTarget;
            // Сохраняем результат
            this.saveAsImageFile(buffer, width, height);
        });
    }

    private saveAsImageFile(buffer: ArrayBuffer, width: number, height: number) {
        // Создаем временный canvas в памяти для генерации картинки
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        const srcData = new Uint8Array(buffer);

        // Переворачиваем картинку по вертикали (из-за особенностей координат OpenGL/WebGL)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIndex = (y * width + x) * 4;
                const destIndex = ((height - 1 - y) * width + x) * 4;
                data[destIndex] = srcData[srcIndex];
                data[destIndex + 1] = srcData[srcIndex + 1];
                data[destIndex + 2] = srcData[srcIndex + 2];
                data[destIndex + 3] = srcData[srcIndex + 3];
            }
        }
        ctx.putImageData(imageData, 0, 0);

        // Скачиваем файл (работает одинаково хорошо в Web Preview и в Editor Game View)
        try {
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `screenshot_${Date.now()}.png`;
            link.href = dataURL;
            link.click();
            link.remove();
        } catch (e) {
            console.error("Не удалось скачать скриншот в текущем окружении:", e);
        }
    }
}
