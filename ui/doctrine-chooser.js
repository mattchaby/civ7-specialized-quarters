import Panel from "../../core/ui/panel-support.js";
import { ContextManager } from "../../core/ui/context-manager/context-manager.js";
import { InputEngineEventName } from "../../core/ui/input/input-support.js";
import NavTray from "../../base-standard/ui/navigation-tray/model-navigation-tray.js";
import { Audio } from "../../core/ui/audio-base/audio-support.js";

const content = `
<div class="suzerain-bonus__frame-container mb-14 mt-45">
	<fxs-subsystem-frame class="suzerain-bonus__subsystem-frame flex items-center left-1" box-style="b2" backDrop="blp:city_state_bg">
		<fxs-header class="suzerain-bonus-header mt-5 tracking-150 mb-8 w-96 text-center self-center font-title-xl text-shadow-subtle" filigree-style="h2" data-slot="header" title="LOC_SQ_DOCTRINE_TITLE"></fxs-header>
		<fxs-vslot class="suzerain-bonus__choices-container mx-5 flex flex-col w-128 grow" tabindex="-1" style="max-height:32rem;overflow:auto"></fxs-vslot>
		<div class="mt-1 mb-2" data-slot="footer">
			<fxs-hero-button class="suzerain-bonus__confirm relative my-5 self-center" caption="LOC_UI_RESOURCE_ALLOCATION_CONFIRM" disabled="true"></fxs-hero-button>
		</div>
	</fxs-subsystem-frame>
</div>`;

function french() {
  try {
    return /biblioth/i.test(Locale.compose("LOC_BUILDING_LIBRARY_NAME") || "");
  } catch (error) {
    return true;
  }
}

function doctrineText(doctrine, field) {
  const key = "LOC_SQ_DOC_" + doctrine.id + (field === "name" ? "_NAME" : "_DESC");
  try {
    const composed = Locale.compose(key);
    if (composed && composed !== key) return composed;
  } catch (error) {
    return field === "name" ? (french() ? doctrine.fr : doctrine.en) : (french() ? doctrine.frDesc : doctrine.enDesc);
  }
  if (field === "name") return french() ? doctrine.fr : doctrine.en;
  return french() ? doctrine.frDesc : doctrine.enDesc;
}

class ScreenDoctrineChooser extends Panel {
  confirmButtonListener = this.onConfirm.bind(this);
  entryListener = this.onActivate.bind(this);
  engineInputListener = this.onEngineInput.bind(this);
  currentlySelectedChoice = null;
  onInitialize() {
    this.createCloseButton = false;
  }
  onAttach() {
    super.onAttach();
    this.confirmButton = this.Root.querySelector(".suzerain-bonus__confirm");
    this.entryContainer = this.Root.querySelector(".suzerain-bonus__choices-container");
    this.confirmButton.addEventListener("action-activate", this.confirmButtonListener);
    this.Root.querySelector(".suzerain-bonus__subsystem-frame").addEventListener("subsystem-frame-close", () => {
      this.close();
    });
    this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
    this.createEntries();
    NavTray.clear();
    NavTray.addOrUpdateGenericBack();
  }
  onDetach() {
    this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
    if (this.confirmButton) this.confirmButton.removeEventListener("action-activate", this.confirmButtonListener);
    NavTray.clear();
    super.onDetach();
  }
  createEntries() {
    const choice = globalThis.SQ && SQ.doctrineChoices ? SQ.doctrineChoices() : null;
    if (!choice) {
      this.close();
      return;
    }
    this.offer = choice.offer;
    for (const doctrine of choice.options) {
      const item = document.createElement("fxs-chooser-item");
      item.setAttribute("select-on-activate", "true");
      item.setAttribute("doctrine-id", doctrine.id);
      item.classList.add("mx-3", "my-1\\.5", "flex", "gen-chooser-item");
      item.setAttribute("tabindex", "-1");
      item.addEventListener("action-activate", this.entryListener);
      const row = document.createElement("div");
      row.className = "flex items-center flex-auto";
      const icon = document.createElement("div");
      icon.className = "size-12 bg-no-repeat bg-contain bg-center ml-2";
      const yieldType = doctrine.burstYield || (doctrine.archetype === "MILITARY" ? "YIELD_PRODUCTION" : (SQ.yieldOf && SQ.yieldOf[doctrine.archetype]));
      if (yieldType && UI.getIconCSS) icon.style.backgroundImage = UI.getIconCSS(yieldType, "YIELD");
      const text = document.createElement("div");
      text.className = "flex flex-col m-3 flex-auto";
      const title = document.createElement("div");
      title.className = "text-base font-title mb-1 text-accent-2";
      title.textContent = doctrineText(doctrine, "name");
      const description = document.createElement("div");
      description.className = "text-sm font-body text-accent-3";
      description.textContent = doctrineText(doctrine, "desc");
      text.appendChild(title);
      text.appendChild(description);
      row.appendChild(icon);
      row.appendChild(text);
      item.appendChild(row);
      this.entryContainer.appendChild(item);
    }
  }
  onActivate(event) {
    const entry = event.target && event.target.closest ? event.target.closest(".gen-chooser-item") : null;
    if (!entry) return;
    if (this.currentlySelectedChoice) this.currentlySelectedChoice.setAttribute("selected", "false");
    this.currentlySelectedChoice = entry;
    entry.setAttribute("selected", "true");
    this.confirmButton.removeAttribute("disabled");
    NavTray.addOrUpdateShellAction1("LOC_UI_RESOURCE_ALLOCATION_CONFIRM");
  }
  onEngineInput(inputEvent) {
    if (!inputEvent.detail || inputEvent.detail.status != InputActionStatuses.FINISH) return;
    if (inputEvent.isCancelInput() || inputEvent.detail.name == "sys-menu") {
      this.close();
      inputEvent.stopPropagation();
    }
    if (inputEvent.detail.name == "shell-action-1" && this.currentlySelectedChoice) {
      this.onConfirm();
      inputEvent.stopPropagation();
    }
  }
  onConfirm() {
    if (!this.currentlySelectedChoice || !this.offer || !globalThis.SQ || !SQ.chooseDoctrine) return;
    const id = this.currentlySelectedChoice.getAttribute("doctrine-id");
    if (!SQ.chooseDoctrine(this.offer.x, this.offer.y, id)) return;
    Audio.playSound("data-audio-city-state-bonus-confirm", "city-state-diplomatic");
    this.close();
  }
}

Controls.define("screen-sq-doctrine-chooser", {
  createInstance: ScreenDoctrineChooser,
  description: "Quarter doctrine chooser.",
  classNames: ["city-state-bonus-chooser", "fullscreen"],
  styles: ["fs://game/base-standard/ui/city-state-bonus-chooser/screen-city-state-bonus-chooser.css"],
  innerHTML: [content],
  attributes: []
});

function openChooser() {
  if (!globalThis.SQ || !SQ.doctrineChoices || !SQ.doctrineChoices()) return;
  ContextManager.push("screen-sq-doctrine-chooser", { singleton: true, createMouseGuard: true });
}

if (typeof engine !== "undefined") {
  engine.on("sq-doctrine-offer", () => {
    try { openChooser(); } catch (error) { console.warn("SQ doctrine chooser", error); }
  });
  engine.on("LocalPlayerTurnBegin", () => {
    try { openChooser(); } catch (error) { console.warn("SQ doctrine chooser", error); }
  });
}

console.log("SQ doctrine chooser registered");
