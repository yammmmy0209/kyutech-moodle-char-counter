(function () {
    "use strict";

    const processEditorContainer = (container) => {
        if (container.dataset.charCounterInitialized) {
            return;
        }
        container.dataset.charCounterInitialized = "true";

        const richTextDiv = container.querySelector('div[role="textbox"]');
        if (!richTextDiv) {
            return;
        }

        const counter = document.createElement("div");
        counter.style.textAlign = "right";
        counter.style.fontSize = "0.9em";
        counter.style.color = "#555";
        counter.style.marginTop = "5px";

        richTextDiv.parentElement.appendChild(counter);

        const updateCounter = () => {
            const count = richTextDiv.innerText.trim().replace(
                /\r\n|\r/g,
                "\n",
            ).length;
            counter.textContent = `現在の文字数: ${count}`;
        };

        richTextDiv.addEventListener("input", updateCounter);
        richTextDiv.addEventListener("keyup", updateCounter);
        updateCounter();
    };

    const observeEditors = () => {
        const editorSelector = ".form-group";

        const processFoundContainers = () => {
            document.querySelectorAll(editorSelector).forEach((container) => {
                if (container.querySelector('div[role="textbox"], textarea')) {
                    processEditorContainer(container);
                }
            });
        };

        processFoundContainers();

        const observer = new MutationObserver(processFoundContainers);
        observer.observe(document.body, {childList: true, subtree: true});
    };

    observeEditors();
})();
