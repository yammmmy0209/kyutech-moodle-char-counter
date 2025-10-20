(function () {
    "use strict";

    const createCounter = (targetElement, getCountCallback) => {
        const counter = document.createElement("div");
        counter.style.width = "100%";
        counter.style.textAlign = "right";
        counter.style.fontSize = "0.9em";
        counter.style.color = "#555";
        counter.style.marginTop = "5px";

        targetElement.parentElement.appendChild(counter);

        const updateCounter = () => {
            const textContent = getCountCallback();
            let normalizedText = textContent.replace(/\r\n|\r/g, "\n");
            let textWithoutNewlines = normalizedText.replace(/\n/g, "");
            let count = textWithoutNewlines.length;
            counter.textContent = `現在の文字数: ${count}`;
        };

        return updateCounter;
    };

    // Attoエディタ (標準リッチテキスト)
    const setupAttoCounter = (div) => {
        if (div.dataset.charCounterInitialized) return;
        div.dataset.charCounterInitialized = "true";

        const getCount = () => div.innerText;
        const updateCounter = createCounter(div, getCount);

        div.addEventListener("input", updateCounter);
        div.addEventListener("keyup", updateCounter);
        updateCounter();
    };

    // プレーンテキストエディタ
    const setupTextareaCounter = (area) => {
        if (area.dataset.charCounterInitialized) return;

        if (area.offsetWidth === 0 && area.offsetHeight === 0) {
            return;
        }

        area.dataset.charCounterInitialized = "true";

        const getCount = () => area.value;
        const updateCounter = createCounter(area, getCount);

        area.addEventListener("input", updateCounter);
        area.addEventListener("keyup", updateCounter);
        updateCounter();
    };

    // TinyMCEエディタ
    const setupTinyMCECounter = (container) => {
        if (container.dataset.charCounterInitialized) return;
        container.dataset.charCounterInitialized = "true";

        let intervalId;
        const findIframeBody = () => {
            try {
                const editArea = container.querySelector(".tox-edit-area");
                if (!editArea) return;

                const iframe = editArea.querySelector("iframe");
                if (!iframe) return;

                const iframeDoc = iframe.contentDocument;
                if (!iframeDoc) return;

                const richTextDiv = iframeDoc.querySelector("html body");
                if (!richTextDiv) return;

                // --- 成功 ---
                clearInterval(intervalId);

                // カウンターを作成・設置 (TinyMCEはコンテナの末尾に追加)
                const getCount = () => richTextDiv.innerText;
                const counter = document.createElement("div");
                counter.style.width = "100%";
                counter.style.textAlign = "right";
                counter.style.fontSize = "0.9em";
                counter.style.color = "#555";
                counter.style.marginTop = "5px";

                container.appendChild(counter);

                const updateCounter = () => {
                    const textContent = getCount();
                    let normalizedText = textContent.replace(/\r\n|\r/g, "\n");
                    let textWithoutNewlines = normalizedText.replace(/\n/g, "");
                    let count = textWithoutNewlines.length;
                    counter.textContent = `現在の文字数: ${count}`;
                };

                richTextDiv.addEventListener("input", updateCounter);
                richTextDiv.addEventListener("keyup", updateCounter);
                updateCounter();
            } catch (e) {
                // エラーが発生しても、次のポーリングまで待機
                console.log('Moodle Counter: TinyMCEのiframeをポーリング中...');
            }
        };

        intervalId = setInterval(findIframeBody, 1000);
    };

    const findEditors = (doc) => {
        doc.querySelectorAll('div[role="textbox"]').forEach(setupAttoCounter);
        doc.querySelectorAll("textarea").forEach(setupTextareaCounter);
        doc.querySelectorAll('div[role="application"]').forEach(
            setupTinyMCECounter,
        );
    };

    const main = () => {
        findEditors(document);

        const observer = new MutationObserver((mutations) => {
            findEditors(document);

            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.tagName === "IFRAME") {
                        node.addEventListener("load", () => {
                            try {
                                const iframeDoc = node.contentDocument;
                                if (iframeDoc) {
                                    findEditors(iframeDoc);
                                    const iframeObserver = new MutationObserver(
                                        () => findEditors(iframeDoc),
                                    );
                                    iframeObserver.observe(iframeDoc.body, {
                                        childList: true,
                                        subtree: true,
                                    });
                                }
                            } catch (e) {
                                console.log('Moodle Counter: iframeにアクセスできませんでした。', e);
                            }
                        });
                    }
                }
            }
        });

        observer.observe(document.body, {childList: true, subtree: true});
    };

    main();
})();
