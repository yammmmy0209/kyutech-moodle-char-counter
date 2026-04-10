(function () {
    ("use strict");

    const PRIORITY = {
        tinymce: 3,
        atto: 2,
        plain: 1
    };

    // エディタの親要素（ラッパー）を取得してグループ化の基準にする
    const getEditorGroup = (element) => {
        // Moodleの一般的なフォーム要素ラッパーを優先して取得
        const wrapper = element.closest('.fitem, .felement, .form-group, .editor-container, .feditor');
        return wrapper || element.parentElement;
    };

    const createCounter = (targetElement, getCountCallback, editorType) => {
        const group = getEditorGroup(targetElement);

        let wrapper = group.querySelector('.moodle-char-counter-wrapper');
        const currentPriority = PRIORITY[editorType] || 0;

        if (wrapper) {
            const existingPriority = parseInt(wrapper.dataset.priority || "0", 10);
            // すでに優先度が高い（または同じ）カウンターが存在する場合は何もしない
            if (currentPriority <= existingPriority) {
                return null;
            }
            // 既存のカウンター（低優先度）を削除して上書き
            wrapper.remove();
        }

        wrapper = document.createElement("div");
        wrapper.className = "moodle-char-counter-wrapper";
        wrapper.dataset.priority = currentPriority;
        wrapper.dataset.editorType = editorType;
        wrapper.style.width = "100%";
        wrapper.style.textAlign = "right";
        wrapper.style.fontSize = "0.9em";
        wrapper.style.color = "#555";
        wrapper.style.marginTop = "5px";

        if (editorType === 'plain') {
            // Moodleのリッチエディタ遅延ロードによるチラつきを防ぐため、プレーンエディタ用のカウンターは最初は非表示・透明にする
            wrapper.style.display = 'none';
            wrapper.style.opacity = '0';
            wrapper.style.transition = 'opacity 0.2s ease-in';

            setTimeout(() => {
                // すでにリッチエディタに上書きされてDOMから消え去っていれば何もしない
                if (!wrapper.isConnected) return;

                // 500ms経ってもターゲット（textarea）が画面上に存在していれば（非表示にされていなければ）
                // 本当のプレーンエディタとみなして表示する
                const style = window.getComputedStyle(targetElement);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    wrapper.style.display = 'block';
                    requestAnimationFrame(() => {
                        wrapper.style.opacity = '1';
                    });
                }
            }, 500);
        }

        // TinyMCEの場合はコンテナ内末尾に、それ以外は親要素の末尾に追加
        if (editorType === 'tinymce') {
            targetElement.appendChild(wrapper);
        } else {
            targetElement.parentElement.appendChild(wrapper);
        }

        const updateCounter = () => {
            // カウンターDOMが削除された後はリスナーを安全に止める
            if (!wrapper.isConnected) return;

            const textContent = getCountCallback();
            let normalizedText = textContent.replace(/\r\n|\r/g, "\n");
            let textWithoutNewlines = normalizedText.replace(/\n/g, "");
            let count = textWithoutNewlines.length;
            wrapper.textContent = `現在の文字数: ${count}`;
        };

        return updateCounter;
    };

    // Attoエディタ (標準リッチテキスト)
    const setupAttoCounter = (div) => {
        if (div.dataset.charCounterInitialized) return;
        div.dataset.charCounterInitialized = "true";

        const getCount = () => div.innerText;
        const updateCounter = createCounter(div, getCount, 'atto');

        if (updateCounter) {
            div.addEventListener("input", updateCounter);
            div.addEventListener("keyup", updateCounter);
            updateCounter();
        }
    };

    // プレーンテキストエディタ
    const setupTextareaCounter = (area) => {
        if (area.dataset.charCounterInitialized) return;

        if (area.id && document.getElementById(area.id + "editable")) {
            return;
        }

        const style = window.getComputedStyle(area);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return;
        }

        area.dataset.charCounterInitialized = "true";

        const getCount = () => area.value;
        const updateCounter = createCounter(area, getCount, 'plain');

        if (updateCounter) {
            area.addEventListener("input", updateCounter);
            area.addEventListener("keyup", updateCounter);
            updateCounter();
        }
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

                const getCount = () => richTextDiv.innerText;
                const updateCounter = createCounter(container, getCount, 'tinymce');

                if (updateCounter) {
                    richTextDiv.addEventListener("input", updateCounter);
                    richTextDiv.addEventListener("keyup", updateCounter);
                    updateCounter();
                }
            } catch (e) {
                // エラーが発生しても、次のポーリングまで待機
                console.log("Moodle Counter: TinyMCEのiframeをポーリング中...");
            }
        };

        intervalId = setInterval(findIframeBody, 1000);
    };

    const findEditors = (doc) => {
        // 全ての候補要素を一度に取得
        const candidates = [
            ...doc.querySelectorAll('div[role="textbox"]'), // Atto
            ...doc.querySelectorAll('div[role="application"]'), // TinyMCE
            ...doc.querySelectorAll("textarea") // Plain
        ];

        candidates.forEach(element => {
            const group = getEditorGroup(element);

            // 周囲の情報を読み取り、最終的に表示されるべきエディタを予測する
            const isTinyMCE = group.matches('.editor_tinymce') ||
                              group.querySelector('.editor_tinymce, .tox-tinymce, div[role="application"]');

            const isAtto = group.matches('.editor_atto_wrap') ||
                           group.querySelector('.editor_atto_wrap, div[role="textbox"]');

            let predictedType = 'plain';
            if (isTinyMCE) {
                predictedType = 'tinymce';
            } else if (isAtto) {
                predictedType = 'atto';
            }

            //判定結果に基づいて無駄なく初期化
            if (element.tagName === 'TEXTAREA') {
                // Moodleがリッチエディタ（TinyMCEやAtto）をロードする予定がある場合、プレーンテキストエリアの初期化をスキップして待機する
                if (predictedType !== 'plain') {
                    return;
                }
                setupTextareaCounter(element);
            } else if (element.tagName === 'DIV' && element.getAttribute('role') === 'textbox') {
                setupAttoCounter(element);
            } else if (element.tagName === 'DIV' && element.getAttribute('role') === 'application') {
                setupTinyMCECounter(element);
            }
        });
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
