(function () {
    "use strict";

    /**
     * カウンターを設置するコア機能
     * @param {HTMLElement} targetEditor - 対象のテキストボックス（divまたはtextarea）
     */
    const setupCounter = (targetEditor) => {
        //すでにカウンターが設置済みなら何もしない
        if (targetEditor.dataset.charCounterInitialized) {
            return;
        }

        if (targetEditor.tagName === 'TEXTAREA') {
            const parentContainer = targetEditor.closest('.form-group');
            if (parentContainer && parentContainer.querySelector('div[role="textbox"]')) {
                // 親コンテナ内にリッチエディタ(div[role="textbox"])が既にある場合、このtextareaは「隠れた裏方」なので、カウンターを付けずに処理を終了する
                return;
            }
        }

        // 設置済みフラグを立てる
        targetEditor.dataset.charCounterInitialized = "true";

        const counter = document.createElement("div");
        counter.style.width = "100%";
        counter.style.textAlign = "right";
        counter.style.fontSize = "0.9em";
        counter.style.color = "#555";
        counter.style.marginTop = "5px";

        targetEditor.parentElement.appendChild(counter);

        // 文字数をカウントして更新する
        const updateCounter = () => {
            let count = 0;
            let textContent = "";
            if (targetEditor.tagName === "TEXTAREA") {
                // プレーンテキストエディタの場合
                textContent = targetEditor.value;
            } else {
                // リッチテキストエディタの場合
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
        doc.querySelectorAll('div[role="textbox"], textarea').forEach(
            (editor) => {
                setupCounter(editor);
            },
        );
    };

    /**
     * メインの実行関数
     */
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
