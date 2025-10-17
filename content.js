(function () {
    "use strict";

    // カウンターを設置するコア機能
    const setupCounter = (targetEditor) => {
        const container = targetEditor.closest(".form-group, body"); // エディタを囲む枠か、iframeのbodyを探す
        if (!container || container.dataset.charCounterInitialized) {
            return;
        }
        container.dataset.charCounterInitialized = "true";

        const counter = document.createElement("div");
        counter.style.textAlign = "right";
        counter.style.fontSize = "0.9em";
        counter.style.color = "#555";
        counter.style.marginTop = "5px";

        targetEditor.parentElement.appendChild(counter);

        const updateCounter = () => {
            const count = targetEditor.innerText.replace(
                /\r\n|\r/g,
                "\n",
            ).length;
            counter.textContent = `現在の文字数: ${count}`;
        };

        targetEditor.addEventListener("input", updateCounter);
        targetEditor.addEventListener("keyup", updateCounter);
        updateCounter();
    };

    // 監視対象のドキュメントでエディタを探す関数
    const findEditor = (doc) => {
        // Moodleの標準的なリッチテキストエディタのセレクタ
        const editor = doc.querySelector('div[role="textbox"]');
        if (editor) {
            setupCounter(editor);
        }
    };

    // メインの実行関数
    const main = () => {
        // まず、現在のドキュメントでエディタを探す
        findEditor(document);

        // 監視を開始
        const observer = new MutationObserver((mutations) => {
            // ページに何かが追加されたら、エディタがいないか再度探す
            findEditor(document);

            // もしiframeが追加されたら、その中も監視対象にする
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.tagName === "IFRAME") {
                        // iframeが完全に読み込まれるのを待つ
                        node.addEventListener("load", () => {
                            try {
                                // iframeの中のdocumentを取得して、そこでもエディタを探す
                                const iframeDoc = node.contentDocument;
                                if (iframeDoc) {
                                    findEditor(iframeDoc);
                                    // iframeの中も監視する
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

    // 実行
    main();
})();
