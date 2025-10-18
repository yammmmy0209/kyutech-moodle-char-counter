(function () {
    "use strict";

    const createCounter = (targetElement, getCountCallback) => {
        const counter = document.createElement("div");
        counter.style.width = "100%";
        counter.style.textAlign = "right";
        counter.style.fontSize = "0.9em";
        counter.style.color = "#555";
        counter.style.marginTop = "5px";

        // エディタの親要素にカウンターを追加
        targetElement.parentElement.appendChild(counter);

        // カウントを更新する内部関数
        const updateCounter = () => {
            const textContent = getCountCallback();
            let normalizedText = textContent.replace(/\r\n|\r/g, "\n");
            let textWithoutNewlines = normalizedText.replace(/\n/g, "");
            let count = textWithoutNewlines.length;
            counter.textContent = `現在の文字数: ${count}`;
        };

        return updateCounter;
    };

    /**
     * @param {HTMLElement} div - The <div role="textbox"> element
     */
    const setupAttoCounter = (div) => {
        if (div.dataset.charCounterInitialized) return;
        div.dataset.charCounterInitialized = "true";

        const getCount = () => div.innerText;
        const updateCounter = createCounter(div, getCount);

        div.addEventListener("input", updateCounter);
        div.addEventListener("keyup", updateCounter);
        updateCounter();
    };

    /**
     * @param {HTMLElement} area - The <textarea> element
     */
    const setupTextareaCounter = (area) => {
        if (area.dataset.charCounterInitialized) return;

        // 「非表示」のtextarea（リッチエディタの裏方）は無視する
        if (area.offsetParent === null) {
            return;
        }

        area.dataset.charCounterInitialized = "true";

        const getCount = () => area.value;
        const updateCounter = createCounter(area, getCount);

        area.addEventListener("input", updateCounter);
        area.addEventListener("keyup", updateCounter);
        updateCounter();
    };

    /**
     * @param {HTMLElement} container - The <div role="application"> container
     */
    const setupTinyMCECounter = (container) => {
        if (container.dataset.charCounterInitialized) return;
        container.dataset.charCounterInitialized = "true";

        let intervalId;
        const findIframeBody = () => {
            try {
                // 発見したセレクタでiframe内のbodyを探す
                const editArea = container.querySelector(".tox-edit-area");
                if (!editArea) return; // まだ準備中

                const iframe = editArea.querySelector("iframe");
                if (!iframe) return; // まだ準備中

                const iframeDoc = iframe.contentDocument;
                if (!iframeDoc) return; // まだ準備中

                const richTextDiv = iframeDoc.querySelector("html body");
                if (!richTextDiv) return; // まだ準備中

                // --- 成功 ---
                // 編集エリアを発見したので、ポーリングを停止
                clearInterval(intervalId);

                // カウンターを作成・設置
                const getCount = () => richTextDiv.innerText;
                const counter = document.createElement("div");
                counter.style.width = "100%";
                counter.style.textAlign = "right";
                counter.style.fontSize = "0.9em";
                counter.style.color = "#555";
                counter.style.marginTop = "5px";

                // カウンターはiframeの外側、エディタの大枠コンテナに追加
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
                console.log("Moodle Counter: TinyMCEのiframeをポーリング中...");
            }
        };

        // 1秒ごとにiframe内のbodyを探しに行くポーリングを開始
        intervalId = setInterval(findIframeBody, 1000);
    };

    /**
     * ページ内の全エディタタイプを検索してセットアップする
     * @param {Document} doc - The document (or iframe document) to search
     */
    const findEditors = (doc) => {
        doc.querySelectorAll('div[role="textbox"]').forEach(setupAttoCounter);
        doc.querySelectorAll("textarea").forEach(setupTextareaCounter);
        doc.querySelectorAll('div[role="application"]').forEach(
            setupTinyMCECounter,
        );
    };

    const main = () => {
        findEditors(document);

        // ページが動的に変化したかを監視
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
                                console.log(
                                    "Moodle Counter: iframeにアクセスできませんでした。",
                                    e,
                                );
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
