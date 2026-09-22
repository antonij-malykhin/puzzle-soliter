import { YandexGames } from "ysdk";
import { game, cclegacy } from "cc";
import { EDITOR } from "cc/env";
import { L10NManager } from "./core/l10n";

export let ysdk = {} as YandexGames.SDK;

export const l10n = L10NManager.instance;

const shouldSkipYandexInit =
  EDITOR ||
  cclegacy.GAME_VIEW ||
  (typeof window !== "undefined" && window.parent === window);

if (shouldSkipYandexInit) {
  // Local editor / standalone preview: keep the project runnable without
  // forcing the Yandex SDK handshake against a missing parent window.
  // We can use top-level await in editor
  // @ts-ignore
  await l10n["init"]();
} else {
  // For a real Yandex-hosted runtime, initialize the SDK after project init.
  game.onPostProjectInitDelegate.add(async () => {
    ysdk = await YaGames.init();
    await l10n["init"]();
    l10n.changeLanguage(ysdk.environment.i18n.lang);
  });
}

export * from "./common";
