(function () {
    "use strict";

    /**
     * カウンターを設置するコア機能
     * @param {HTMLElement} targetEditor - 対象のテキストボックス（divまたはtextarea）
     */
    const setupCounter = (targetEditor) => {
        if (targetEditor.dataset.charCounterInitialized) {
            return;
        }
        targetEditor.dataset.charCounterInitialized = "true";

        const counter = document.createElement("div");
        counter.style.width = "100%";
        counter.style.textAlign = "right";
        counter.style.fontSize = "0.9em";
        counter.style.color = "#555";
        counter.style.marginTop = "5px";

        targetEditor.parentElement.appendChild(counter);

        const updateCounter = () => {
            let count = 0;
            let textContent = "";
            if (targetEditor.tagName === "TEXTAREA") {
                textContent = targetEditor.value;
            } else {
                textContent = targetEditor.innerText;
            }

            let normalizedText = textContent.replace(/\r\n|\r/g, "\n");
            let textWithoutNewlines = normalizedText.replace(/\n/g, "");
            count = textWithoutNewlines.length;

            counter.textContent = `現在の文字数: ${count}`;
        };

        targetEditor.addEventListener("input", updateCounter);
        targetEditor.addEventListener("keyup", updateCounter);
        updateCounter();
    };

    /**
     * 監視対象のドキュメントでエディタを探す関数
     * @param {Document} doc - 検索対象のドキュメント
     */
    const findEditor = (doc) => {
        doc.querySelectorAll('div[role="textbox"]').forEach((div) => {
            setupCounter(div);
        });

        doc.querySelectorAll("textarea").forEach((area) => {
            if (area.offsetParent !== null) {
                //これは「表示されている」プレーンテキストエディタなので、カウンターを設置
                setupCounter(area);
            }
            // (offsetParentがnullのtextareaは、リッチエディタの裏方か非表示のフォームの一部なので、無視する)
        });
    };

    const main = () => {
        findEditor(document); // まず現在のドキュメントで探す

        // ページ全体の変更を監視
        const observer = new MutationObserver((mutations) => {
            findEditor(document); // 動的な変更でも探す

            // iframeの処理
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.tagName === "IFRAME") {
                        node.addEventListener("load", () => {
                            try {
                                const iframeDoc = node.contentDocument;
                                if (iframeDoc) {
                                    findEditor(iframeDoc);
                                    const iframeObserver = new MutationObserver(
                                        () => findEditor(iframeDoc),
                                    );
                                    iframeObserver.observe(iframeDoc.body, {
                                        childList: true,
                                        subtree: true,
                                    });
                                }
                            } catch (e) {
                                console.log(
                                    "クロスオリジンのiframeにはアクセスできませんでした。",
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
