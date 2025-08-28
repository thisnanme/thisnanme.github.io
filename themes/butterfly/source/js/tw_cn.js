// ==UserScript==
// @name         Hexo 主题重构脚本
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  重构 Hexo 主题 JS 代码以提高可读性和可维护性
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // --- 全局状态 ---
        let headerContentWidth, $nav;
        let mobileSidebarOpen = false;
        const GLOBAL_CONFIG = window.GLOBAL_CONFIG || {};
        const GLOBAL_CONFIG_SITE = window.GLOBAL_CONFIG_SITE || {};

        // --- 初始化和调整 ---

        /**
         * 调整导航菜单显示（响应式）
         * @param {boolean} init 是否为初始化调用
         */
        const adjustMenu = (init) => {
            const getAllWidth = (elements) => Array.from(elements).reduce((width, el) => width + el.offsetWidth, 0);

            if (init) {
                const blogInfo = document.querySelector('#blog-info > a');
                const menus = document.getElementById('menus');
                if (blogInfo && menus) {
                    const blogInfoWidth = getAllWidth(blogInfo.children);
                    const menusWidth = getAllWidth(menus.children);
                    headerContentWidth = blogInfoWidth + menusWidth;
                }
                $nav = document.getElementById('nav');
            }

            if ($nav) {
                const shouldHideMenu = window.innerWidth <= 768 || headerContentWidth > ($nav.offsetWidth - 120);
                $nav.classList.toggle('hide-menu', shouldHideMenu);
            }
        };

        /**
         * 初始化并显示导航栏
         */
        const initAdjust = () => {
            adjustMenu(true);
            if ($nav) {
                $nav.classList.add('show');
            }
        };

        // --- 侧边栏处理 ---

        const sidebarFn = {
            open: () => {
                btf?.overflowPaddingR?.add();
                btf?.animateIn(document.getElementById('menu-mask'), 'to_show 0.5s');
                document.getElementById('sidebar-menus')?.classList.add('open');
                mobileSidebarOpen = true;
            },
            close: () => {
                btf?.overflowPaddingR?.remove();
                btf?.animateOut(document.getElementById('menu-mask'), 'to_hide 0.5s');
                document.getElementById('sidebar-menus')?.classList.remove('open');
                mobileSidebarOpen = false;
            }
        };

        // --- 首页功能 ---

        /**
         * 首页向下滚动箭头功能
         */
        const scrollDownInIndex = () => {
            const $scrollDownEle = document.getElementById('scroll-down');
            if ($scrollDownEle) {
                const handleScrollToDest = () => {
                    const targetTop = document.getElementById('content-inner')?.offsetTop;
                    if (targetTop !== undefined) {
                        btf?.scrollToDest(targetTop, 300);
                    }
                };
                btf?.addEventListenerPjax($scrollDownEle, 'click', handleScrollToDest);
            }
        };

        // --- 代码块功能 ---

        /**
         * 为代码块添加工具栏（复制、语言、收缩等）
         */
        const addHighlightTool = () => {
            const highLight = GLOBAL_CONFIG.highlight;
            if (!highLight) return;

            const { highlightCopy, highlightLang, highlightHeightLimit, highlightFullpage, highlightMacStyle, plugin } = highLight;
            const isHighlightShrink = GLOBAL_CONFIG_SITE.isHighlightShrink;
            const isShowTool = highlightCopy || highlightLang || isHighlightShrink !== undefined || highlightFullpage || highlightMacStyle;

            const selector = plugin === 'highlight.js' ? 'figure.highlight' : 'pre[class*="language-"]';
            const $figureHighlight = document.querySelectorAll(selector);

            if (!((isShowTool || highlightHeightLimit) && $figureHighlight.length)) return;

            const isPrismjs = plugin === 'prismjs';
            const highlightShrinkClass = isHighlightShrink === true ? 'closed' : '';
            const highlightShrinkEle = isHighlightShrink !== undefined ? '<i class="fas fa-angle-down expand"></i>' : '';
            const highlightCopyEle = highlightCopy ? '<div class="copy-notice"></div><i class="fas fa-paste copy-button"></i>' : '';
            const highlightMacStyleEle = '<div class="macStyle"><div class="mac-close"></div><div class="mac-minimize"></div><div class="mac-maximize"></div></div>';
            const highlightFullpageEle = highlightFullpage ? '<i class="fa-solid fa-up-right-and-down-left-from-center fullpage-button"></i>' : '';

            const alertInfo = (ele, text) => {
                if (GLOBAL_CONFIG.Snackbar !== undefined) {
                    btf?.snackbarShow(text);
                } else {
                    if (ele) {
                        ele.textContent = text;
                        ele.style.opacity = 1;
                        setTimeout(() => { ele.style.opacity = 0; }, 800);
                    }
                }
            };

            const copy = async (text, ctx) => {
                try {
                    await navigator.clipboard.writeText(text);
                    alertInfo(ctx, GLOBAL_CONFIG.copy?.success || 'Copied!');
                } catch (err) {
                    console.error('Failed to copy: ', err);
                    alertInfo(ctx, GLOBAL_CONFIG.copy?.noSupport || 'Copy failed!');
                }
            };

            const highlightCopyFn = (ele, clickEle) => {
                const $buttonParent = ele.parentNode;
                $buttonParent?.classList.add('copy-true');
                const preCodeSelector = isPrismjs ? 'pre code' : 'table .code pre';
                const codeElement = $buttonParent?.querySelector(preCodeSelector);
                if (codeElement) {
                    copy(codeElement.innerText, clickEle?.previousElementSibling);
                }
                $buttonParent?.classList.remove('copy-true');
            };

            const highlightShrinkFn = (ele) => ele?.classList.toggle('closed');

            const codeFullpage = (item, clickEle) => {
                const wrapEle = item?.closest('figure.highlight');
                if (wrapEle) {
                    const isFullpage = wrapEle.classList.toggle('code-fullpage');
                    document.body.style.overflow = isFullpage ? 'hidden' : '';
                    clickEle?.classList.toggle('fa-down-left-and-up-right-to-center', isFullpage);
                    clickEle?.classList.toggle('fa-up-right-and-down-left-from-center', !isFullpage);
                }
            };

            const highlightToolsFn = (e) => {
                const $target = e.target.classList;
                const currentElement = e.currentTarget;
                if ($target.contains('expand')) highlightShrinkFn(currentElement);
                else if ($target.contains('copy-button')) highlightCopyFn(currentElement, e.target);
                else if ($target.contains('fullpage-button')) codeFullpage(currentElement, e.target);
            };

            const expandCode = (e) => e.currentTarget?.classList.toggle('expand-done');

            const getActualHeight = (item) => {
                const hiddenElements = new Map();
                const fix = () => {
                    let current = item;
                    while (current !== document.body && current != null) {
                        if (window.getComputedStyle(current).display === 'none') {
                            hiddenElements.set(current, current.getAttribute('style') || '');
                        }
                        current = current.parentNode;
                    }
                    const style = 'visibility: hidden !important; display: block !important;';
                    hiddenElements.forEach((originalStyle, elem) => {
                        elem.setAttribute('style', originalStyle ? originalStyle + ';' + style : style);
                    });
                };
                const restore = () => {
                    hiddenElements.forEach((originalStyle, elem) => {
                        if (originalStyle === '') elem.removeAttribute('style');
                        else elem.setAttribute('style', originalStyle);
                    });
                };
                fix();
                const height = item.offsetHeight;
                restore();
                return height;
            };

            const createEle = (lang, item) => {
                const fragment = document.createDocumentFragment();
                if (isShowTool) {
                    const hlTools = document.createElement('div');
                    hlTools.className = `highlight-tools ${highlightShrinkClass}`;
                    hlTools.innerHTML = highlightMacStyleEle + highlightShrinkEle + lang + highlightCopyEle + highlightFullpageEle;
                    btf?.addEventListenerPjax(hlTools, 'click', highlightToolsFn);
                    fragment.appendChild(hlTools);
                }
                if (highlightHeightLimit && getActualHeight(item) > highlightHeightLimit + 30) {
                    const ele = document.createElement('div');
                    ele.className = 'code-expand-btn';
                    ele.innerHTML = '<i class="fas fa-angle-double-down"></i>';
                    btf?.addEventListenerPjax(ele, 'click', expandCode);
                    fragment.appendChild(ele);
                }
                if (isPrismjs) {
                    item.parentNode?.insertBefore(fragment, item);
                } else {
                    item.insertBefore(fragment, item.firstChild);
                }
            };

            $figureHighlight.forEach(item => {
                let langName = '';
                if (isPrismjs) btf?.wrap(item, 'figure', { class: 'highlight' });
                if (!highlightLang) {
                    createEle('', item);
                    return;
                }
                if (isPrismjs) {
                    langName = item.getAttribute('data-language') || 'Code';
                } else {
                    langName = item.getAttribute('class')?.split(' ')[1];
                    if (langName === 'plain' || langName === undefined) langName = 'Code';
                }
                createEle(`<div class="code-lang">${langName}</div>`, item);
            });
        };

        // --- 图片功能 ---

        /**
         * 为图片添加说明文字（基于 alt/title）
         */
        const addPhotoFigcaption = () => {
            if (!GLOBAL_CONFIG.isPhotoFigcaption) return;
            document.querySelectorAll('#article-container img').forEach(item => {
                const altValue = item.title || item.alt;
                if (!altValue) return;
                const ele = document.createElement('div');
                ele.className = 'img-alt text-center';
                ele.textContent = altValue;
                item.insertAdjacentElement('afterend', ele);
            });
        };

        /**
         * 初始化图片灯箱效果
         */
        const runLightbox = () => {
            btf?.loadLightbox(document.querySelectorAll('#article-container img:not(.no-lightbox)'));
        };

        // --- 图库排版功能 ---

        const fetchUrl = async (url) => {
            try {
                const response = await fetch(url);
                return await response.json();
            } catch (error) {
                console.error('Failed to fetch URL:', error);
                return [];
            }
        };

        const runJustifiedGallery = (container, data, config) => {
            const { isButton, limit, firstLimit, tabs } = config;
            const dataLength = data.length;
            const maxGroupKey = Math.ceil((dataLength - firstLimit) / limit + 1);

            const igConfig = {
                gap: 5,
                isConstantSize: true,
                sizeRange: [150, 600],
                useTransform: true
            };

            const ig = new InfiniteGrid.JustifiedInfiniteGrid(container, igConfig);
            let isLayoutHidden = false;

            const sanitizeString = (str) => (str && str.replace(/"/g, '&quot;')) || '';
            const createImageItem = (item) => {
                const alt = item.alt ? `alt="${sanitizeString(item.alt)}"` : '';
                const title = item.title ? `title="${sanitizeString(item.title)}"` : '';
                return `<div class="item">
                    <img src="${item.url}" data-grid-maintained-target="true" ${alt} ${title} />
                  </div>`;
            };

            const getItems = (nextGroupKey, count, isFirst = false) => {
                const startIndex = isFirst ? (nextGroupKey - 1) * count : (nextGroupKey - 2) * count + firstLimit;
                return data.slice(startIndex, startIndex + count).map(createImageItem);
            };

            const addLoadMoreButton = (container) => {
                const button = document.createElement('button');
                button.innerHTML = `${GLOBAL_CONFIG.infinitegrid?.buttonText || 'Load More'}<i class="fa-solid fa-arrow-down"></i>`;
                button.addEventListener('click', () => {
                    button.remove();
                    btf?.setLoading?.add(container);
                    appendItems(ig.getGroups().length + 1, limit);
                }, { once: true });
                container.insertAdjacentElement('afterend', button);
            };

            const appendItems = (nextGroupKey, count, isFirst) => {
                ig.append(getItems(nextGroupKey, count, isFirst), nextGroupKey);
            };

            const handleRenderComplete = (e) => {
                if (tabs) {
                    const parentNode = container.parentNode;
                    if (isLayoutHidden) {
                        parentNode.style.visibility = 'visible';
                    }
                    if (container.offsetHeight === 0) {
                        parentNode.style.visibility = 'hidden';
                        isLayoutHidden = true;
                    }
                }
                const { updated, isResize, mounted } = e;
                if (!updated.length || !mounted.length || isResize) return;
                btf?.loadLightbox(container.querySelectorAll('img:not(.medium-zoom-image)'));
                if (ig.getGroups().length === maxGroupKey) {
                    btf?.setLoading?.remove(container);
                    !tabs && ig.off('renderComplete', handleRenderComplete);
                    return;
                }
                if (isButton) {
                    btf?.setLoading?.remove(container);
                    addLoadMoreButton(container);
                }
            };

            const handleRequestAppend = btf?.debounce((e) => {
                const nextGroupKey = (+e.groupKey || 0) + 1;
                if (nextGroupKey === 1) appendItems(nextGroupKey, firstLimit, true);
                else appendItems(nextGroupKey, limit);
                if (nextGroupKey === maxGroupKey) ig.off('requestAppend', handleRequestAppend);
            }, 300);

            btf?.setLoading?.add(container);
            ig.on('renderComplete', handleRenderComplete);

            if (isButton) {
                appendItems(1, firstLimit, true);
            } else {
                ig.on('requestAppend', handleRequestAppend);
                ig.renderItems();
            }

            btf?.addGlobalFn?.('pjaxSendOnce', () => ig.destroy());
        };

        const addJustifiedGallery = async (elements, tabs = false) => {
            if (!elements.length) return;
            const initGallery = async () => {
                for (const element of elements) {
                    if (btf?.isHidden(element) || element.classList.contains('loaded')) continue;
                    const config = {
                        isButton: element.getAttribute('data-button') === 'true',
                        limit: parseInt(element.getAttribute('data-limit'), 10),
                        firstLimit: parseInt(element.getAttribute('data-first'), 10),
                        tabs
                    };
                    const container = element.firstElementChild;
                    const content = container.textContent;
                    container.textContent = '';
                    element.classList.add('loaded');
                    try {
                        const data = element.getAttribute('data-type') === 'url' ? await fetchUrl(content) : JSON.parse(content);
                        runJustifiedGallery(container, data, config);
                    } catch (error) {
                        console.error('Gallery data parsing failed:', error);
                    }
                }
            };

            if (typeof InfiniteGrid === 'function') {
                await initGallery();
            } else {
                await btf?.getScript(GLOBAL_CONFIG.infinitegrid?.js);
                await initGallery();
            }
        };

        // --- 滚动处理 ---

        /**
         * 更新右侧按钮的滚动百分比
         */
        const rightsideScrollPercent = (currentTop) => {
            const scrollPercent = btf?.getScrollPercent(currentTop, document.body) || 0;
            const goUpElement = document.getElementById('go-up');
            if (goUpElement) {
                if (scrollPercent < 95) {
                    goUpElement.classList.add('show-percent');
                    const percentElement = goUpElement.querySelector('.scroll-percent');
                    if (percentElement) percentElement.textContent = scrollPercent;
                } else {
                    goUpElement.classList.remove('show-percent');
                }
            }
        };

        /**
         * 主滚动处理函数
         */
        const scrollFn = () => {
            const $rightside = document.getElementById('rightside');
            const innerHeight = window.innerHeight + 56;
            let initTop = 0;
            const $header = document.getElementById('page-header');
            const isChatBtn = typeof window.chatBtn !== 'undefined';
            const isShowPercent = GLOBAL_CONFIG.percent?.rightside;

            const checkDocumentHeight = () => {
                if (document.body.scrollHeight <= innerHeight) {
                    $rightside?.classList.add('rightside-show');
                    return true;
                }
                return false;
            };

            if (checkDocumentHeight()) return;

            const scrollDirection = (currentTop) => {
                const result = currentTop > initTop;
                initTop = currentTop;
                return result;
            };

            let flag = '';
            const scrollTask = btf?.throttle(() => {
                const currentTop = window.scrollY || document.documentElement.scrollTop;
                const isDown = scrollDirection(currentTop);

                if (currentTop > 56) {
                    if (flag === '') {
                        $header?.classList.add('nav-fixed');
                        $rightside?.classList.add('rightside-show');
                    }
                    if (isDown) {
                        if (flag !== 'down') {
                            $header?.classList.remove('nav-visible');
                            isChatBtn && window.chatBtn.hide && window.chatBtn.hide();
                            flag = 'down';
                        }
                    } else {
                        if (flag !== 'up') {
                            $header?.classList.add('nav-visible');
                            isChatBtn && window.chatBtn.show && window.chatBtn.show();
                            flag = 'up';
                        }
                    }
                } else {
                    flag = '';
                    if (currentTop === 0) {
                        $header?.classList.remove('nav-fixed', 'nav-visible');
                    }
                    $rightside?.classList.remove('rightside-show');
                }

                isShowPercent && rightsideScrollPercent(currentTop);
                checkDocumentHeight();
            }, 300);

            btf?.addEventListenerPjax(window, 'scroll', scrollTask, { passive: true });
        };

        /**
         * TOC 和 Anchor 处理
         */
        const scrollFnToDo = () => {
            const isToc = GLOBAL_CONFIG_SITE.isToc;
            const isAnchor = GLOBAL_CONFIG.isAnchor;
            const $article = document.getElementById('article-container');
            if (!($article && (isToc || isAnchor))) return;

            let $tocLink, $cardToc, autoScrollToc, $tocPercentage, isExpand;

            if (isToc) {
                const $cardTocLayout = document.getElementById('card-toc');
                $cardToc = $cardTocLayout?.querySelector('.toc-content');
                $tocLink = $cardToc?.querySelectorAll('.toc-link');
                $tocPercentage = $cardTocLayout?.querySelector('.toc-percentage');
                isExpand = $cardToc?.classList.contains('is-expand');

                const tocItemClickFn = (e) => {
                    const target = e.target.closest('.toc-link');
                    if (!target) return;
                    e.preventDefault();
                    const href = target.getAttribute('href');
                    if (href) {
                        const targetId = decodeURI(href).replace('#', '');
                        const targetElement = document.getElementById(targetId);
                        if (targetElement) {
                            btf?.scrollToDest(btf?.getEleTop(targetElement), 300);
                        }
                    }
                    if (window.innerWidth < 900) {
                        $cardTocLayout?.classList.remove('open');
                    }
                };
                if ($cardToc) {
                    btf?.addEventListenerPjax($cardToc, 'click', tocItemClickFn);
                }

                autoScrollToc = (item) => {
                    if (!$cardToc) return;
                    const sidebarHeight = $cardToc.clientHeight;
                    const itemOffsetTop = item.offsetTop;
                    const itemHeight = item.clientHeight;
                    const scrollTop = $cardToc.scrollTop;
                    const offset = itemOffsetTop - scrollTop;
                    const middlePosition = (sidebarHeight - itemHeight) / 2;
                    if (offset !== middlePosition) {
                        $cardToc.scrollTop = scrollTop + (offset - middlePosition);
                    }
                };

                if ($cardTocLayout) {
                    $cardTocLayout.style.display = 'block';
                }
            }

            const $articleList = $article.querySelectorAll('h1,h2,h3,h4,h5,h6');
            let detectItem = '';

            const findHeadPosition = (top) => {
                if (top === 0) return false;
                let currentId = '';
                let currentIndex = '';
                for (let i = 0; i < $articleList.length; i++) {
                    const ele = $articleList[i];
                    if (top > (btf?.getEleTop(ele) - 80)) {
                        const id = ele.id;
                        currentId = id ? '#' + encodeURI(id) : '';
                        currentIndex = i;
                    } else {
                        break;
                    }
                }
                if (detectItem === currentIndex) return;
                if (isAnchor && btf?.updateAnchor) btf.updateAnchor(currentId);
                detectItem = currentIndex;
                if (isToc && $tocLink && $cardToc) {
                    $cardToc.querySelectorAll('.active').forEach(i => i.classList.remove('active'));
                    if (currentId && $tocLink[currentIndex]) {
                        const currentActive = $tocLink[currentIndex];
                        currentActive.classList.add('active');
                        setTimeout(() => autoScrollToc(currentActive), 0);
                        if (!isExpand) {
                            let parent = currentActive.parentNode;
                            while (parent && !parent.matches('.toc')) {
                                if (parent.matches('li')) parent.classList.add('active');
                                parent = parent.parentNode;
                            }
                        }
                    }
                }
            };

            const tocScrollFn = btf?.throttle(() => {
                const currentTop = window.scrollY || document.documentElement.scrollTop;
                if (isToc && GLOBAL_CONFIG.percent?.toc && $tocPercentage) {
                    $tocPercentage.textContent = btf?.getScrollPercent(currentTop, $article) || 0;
                }
                findHeadPosition(currentTop);
            }, 100);

            btf?.addEventListenerPjax(window, 'scroll', tocScrollFn, { passive: true });
        };

        // --- 主题切换处理 ---

        const handleThemeChange = (mode) => {
            const globalFn = window.globalFn || {};
            const themeChange = globalFn.themeChange || {};
            Object.keys(themeChange).forEach(key => {
                const themeChangeFn = themeChange[key];
                if (['disqus', 'disqusjs'].includes(key)) {
                    setTimeout(() => themeChangeFn(mode), 300);
                } else {
                    themeChangeFn(mode);
                }
            });
        };

        // --- 右侧按钮功能 ---

        const rightSideFn = {
            readmode: () => {
                const $body = document.body;
                const newEle = document.createElement('button');
                const exitReadMode = () => {
                    $body.classList.remove('read-mode');
                    newEle.remove();
                    newEle.removeEventListener('click', exitReadMode);
                };
                $body.classList.add('read-mode');
                newEle.type = 'button';
                newEle.className = 'fas fa-sign-out-alt exit-readmode';
                newEle.addEventListener('click', exitReadMode);
                $body.appendChild(newEle);
            },
            darkmode: () => {
                const willChangeMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                if (willChangeMode === 'dark') {
                    btf?.activateDarkMode();
                    GLOBAL_CONFIG.Snackbar !== undefined && btf?.snackbarShow(GLOBAL_CONFIG.Snackbar.day_to_night);
                } else {
                    btf?.activateLightMode();
                    GLOBAL_CONFIG.Snackbar !== undefined && btf?.snackbarShow(GLOBAL_CONFIG.Snackbar.night_to_day);
                }
                btf?.saveToLocal?.set('theme', willChangeMode, 2);
                handleThemeChange(willChangeMode);
            },
            'rightside-config': (p, item) => {
                const hideLayout = item.firstElementChild;
                if (hideLayout) {
                    if (hideLayout.classList.contains('show')) {
                        hideLayout.classList.add('status');
                        setTimeout(() => {
                            hideLayout.classList.remove('status');
                        }, 300);
                    }
                    hideLayout.classList.toggle('show');
                }
            },
            'go-up': () => {
                btf?.scrollToDest(0, 500);
            },
            'hide-aside-btn': () => {
                const $htmlDom = document.documentElement.classList;
                const saveStatus = $htmlDom.contains('hide-aside') ? 'show' : 'hide';
                btf?.saveToLocal?.set('aside-status', saveStatus, 2);
                $htmlDom.toggle('hide-aside');
            },
            'mobile-toc-button': (p, item) => {
                const tocEle = document.getElementById('card-toc');
                if (tocEle) {
                    tocEle.style.transition = 'transform 0.3s ease-in-out';
                    const tocEleHeight = tocEle.clientHeight;
                    const btData = item.getBoundingClientRect();
                    const tocEleBottom = window.innerHeight - btData.bottom - 30;
                    if (tocEleHeight > tocEleBottom) {
                        tocEle.style.transformOrigin = `right ${tocEleHeight - tocEleBottom - btData.height / 2}px`;
                    }
                    tocEle.classList.toggle('open');
                    tocEle.addEventListener('transitionend', () => {
                        tocEle.style.cssText = '';
                    }, { once: true });
                }
            },
            'chat-btn': () => {
                window.chatBtnFn && window.chatBtnFn();
            },
            translateLink: () => {
                window.translateFn?.translatePage && window.translateFn.translatePage();
            }
        };

        const bindRightSideEvents = () => {
            const rightside = document.getElementById('rightside');
            if (rightside) {
                rightside.addEventListener('click', e => {
                    const $target = e.target.closest('[id]');
                    if ($target && rightSideFn[$target.id]) {
                        rightSideFn[$target.id](e.currentTarget, $target);
                    }
                });
            }
        };

        // --- 菜单功能 ---

        const clickFnOfSubMenu = () => {
            const handleClickOfSubMenu = (e) => {
                const target = e.target.closest('.site-page.group');
                if (target) {
                    target.classList.toggle('hide');
                }
            };
            const menusItems = document.querySelector('#sidebar-menus .menus_items');
            if (menusItems) {
                menusItems.addEventListener('click', handleClickOfSubMenu);
            }
        };

        const openMobileMenu = () => {
            const toggleMenu = document.getElementById('toggle-menu');
            if (toggleMenu) {
                btf?.addEventListenerPjax(toggleMenu, 'click', () => { sidebarFn.open(); });
            }
        };

        // --- 版权信息 ---

        const addCopyright = () => {
            const { limitCount, languages } = GLOBAL_CONFIG.copyright || {};
            if (limitCount === undefined || !languages) return;

            const handleCopy = (e) => {
                e.preventDefault();
                const copyFont = window.getSelection(0).toString();
                let textFont = copyFont;
                if (copyFont.length > limitCount) {
                    textFont = `${copyFont}\n${languages.author}\n${languages.link}${window.location.href}\n${languages.source}\n${languages.info}`;
                }
                if (e.clipboardData) {
                    return e.clipboardData.setData('text', textFont);
                } else {
                    return window.clipboardData?.setData('text', textFont);
                }
            };
            document.body.addEventListener('copy', handleCopy);
        };

        // --- 其他功能 ---

        const addRuntime = () => {
            const $runtimeCount = document.getElementById('runtimeshow');
            if ($runtimeCount) {
                const publishDate = $runtimeCount.getAttribute('data-publishDate');
                if (publishDate && btf?.diffDate) {
                    $runtimeCount.textContent = `${btf.diffDate(publishDate)} ${GLOBAL_CONFIG.runtime || ''}`;
                }
            }
        };

        const addLastPushDate = () => {
            const $lastPushDateItem = document.getElementById('last-push-date');
            if ($lastPushDateItem) {
                const lastPushDate = $lastPushDateItem.getAttribute('data-lastPushDate');
                if (lastPushDate && btf?.diffDate) {
                    $lastPushDateItem.textContent = btf.diffDate(lastPushDate, true);
                }
            }
        };

        const addTableWrap = () => {
            const $tables = document.querySelectorAll('#article-container table');
            $tables.forEach(item => {
                if (!item.closest('.highlight')) {
                    btf?.wrap(item, 'div', { class: 'table-wrap' });
                }
            });
        };

        const clickFnOfTagHide = () => {
            const hideButtons = document.querySelectorAll('#article-container .hide-button');
            hideButtons.forEach(item => {
                item.addEventListener('click', e => {
                    const currentTarget = e.currentTarget;
                    currentTarget.classList.add('open');
                    addJustifiedGallery(currentTarget.nextElementSibling?.querySelectorAll('.gallery-container') || []);
                }, { once: true });
            });
        };

        const tabsFn = () => {
            const navTabsElements = document.querySelectorAll('#article-container .tabs');
            if (!navTabsElements.length) return;

            const setActiveClass = (elements, activeIndex) => {
                elements.forEach((el, index) => {
                    el.classList.toggle('active', index === activeIndex);
                });
            };

            const handleNavClick = (e) => {
                const target = e.target.closest('button');
                if (!target || target.classList.contains('active')) return;
                const navContainer = e.currentTarget;
                const contentContainer = navContainer.nextElementSibling;
                if (!contentContainer) return;
                const navItems = [...navContainer.children];
                const tabContents = [...contentContainer.children];
                const indexOfButton = navItems.indexOf(target);
                setActiveClass(navItems, indexOfButton);
                navContainer.classList.remove('no-default');
                setActiveClass(tabContents, indexOfButton);
                addJustifiedGallery(tabContents[indexOfButton]?.querySelectorAll('.gallery-container') || [], true);
            };

            const handleToTopClick = (tabElement) => (e) => {
                if (e.target.closest('button')) {
                    btf?.scrollToDest(btf?.getEleTop(tabElement), 300);
                }
            };

            navTabsElements.forEach(tabElement => {
                const nav = tabElement.firstElementChild;
                const content = tabElement.lastElementChild;
                if (nav) btf?.addEventListenerPjax(nav, 'click', handleNavClick);
                if (content) btf?.addEventListenerPjax(content, 'click', handleToTopClick(tabElement));
            });
        };

        const toggleCardCategory = () => {
            const cardCategory = document.querySelector('#aside-cat-list.expandBtn');
            if (!cardCategory) return;
            const handleToggleBtn = (e) => {
                const target = e.target;
                if (target.nodeName === 'I') {
                    e.preventDefault();
                    target.parentNode?.classList.toggle('expand');
                }
            };
            btf?.addEventListenerPjax(cardCategory, 'click', handleToggleBtn, true);
        };

        const addPostOutdateNotice = () => {
            const ele = document.getElementById('post-outdate-notice');
            if (ele) {
                const data = JSON.parse(ele.getAttribute('data'));
                if (data && btf?.diffDate) {
                    const { limitDay, messagePrev, messageNext, postUpdate } = data;
                    const diffDay = btf.diffDate(postUpdate);
                    if (diffDay >= limitDay) {
                        ele.textContent = `${messagePrev} ${diffDay} ${messageNext}`;
                        ele.hidden = false;
                    }
                }
            }
        };

        const lazyloadImg = () => {
            if (window.LazyLoad && GLOBAL_CONFIG.islazyloadPlugin) {
                window.lazyLoadInstance = new LazyLoad({
                    elements_selector: 'img',
                    threshold: 0,
                    data_src: 'lazy-src'
                });
                btf?.addGlobalFn?.('pjaxComplete', () => {
                    window.lazyLoadInstance?.update();
                }, 'lazyload');
            }
        };

        const relativeDate = (selector) => {
            selector.forEach(item => {
                const datetime = item.getAttribute('datetime');
                if (datetime && btf?.diffDate) {
                    item.textContent = btf.diffDate(datetime, true);
                    item.style.display = 'inline';
                }
            });
        };

        const justifiedIndexPostUI = () => {
            const recentPostsElement = document.getElementById('recent-posts');
            if (!(recentPostsElement && recentPostsElement.classList.contains('masonry'))) return;
            const init = () => {
                const masonryItem = new InfiniteGrid.MasonryInfiniteGrid('.recent-post-items', {
                    gap: { horizontal: 10, vertical: 20 },
                    useTransform: true,
                    useResizeObserver: true
                });
                masonryItem.renderItems();
                btf?.addGlobalFn?.('pjaxCompleteOnce', () => { masonryItem.destroy(); }, 'removeJustifiedIndexPostUI');
            };
            if (typeof InfiniteGrid === 'function') {
                init();
            } else {
                btf?.getScript(`${GLOBAL_CONFIG.infinitegrid?.js}`).then(init);
            }
        };

        // --- 事件绑定 (一次性) ---

        const unRefreshFn = () => {
            window.addEventListener('resize', () => {
                adjustMenu(false);
                if (mobileSidebarOpen && btf?.isHidden(document.getElementById('toggle-menu'))) {
                    sidebarFn.close();
                }
            });
            const menuMask = document.getElementById('menu-mask');
            if (menuMask) {
                menuMask.addEventListener('click', () => { sidebarFn.close(); });
            }
            clickFnOfSubMenu();
            lazyloadImg();
            if (GLOBAL_CONFIG.copyright !== undefined) {
                addCopyright();
            }
            if (GLOBAL_CONFIG.autoDarkmode) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    if (btf?.saveToLocal?.get('theme') !== undefined) return;
                    const mode = e.matches ? 'dark' : 'light';
                    handleThemeChange(mode);
                });
            }
        };

        // --- 页面特定功能 ---

        const forPostFn = () => {
            addHighlightTool();
            addPhotoFigcaption();
            addJustifiedGallery(document.querySelectorAll('#article-container .gallery-container'));
            runLightbox();
            scrollFnToDo();
            addTableWrap();
            clickFnOfTagHide();
            tabsFn();
        };

        // --- 主刷新逻辑 ---

        const refreshFn = () => {
            initAdjust();
            justifiedIndexPostUI();

            const pageType = GLOBAL_CONFIG_SITE.pageType;
            if (pageType === 'post') {
                addPostOutdateNotice();
                if (GLOBAL_CONFIG.relativeDate?.post) {
                    relativeDate(document.querySelectorAll('#post-meta time'));
                }
            } else if (pageType === 'home') {
                if (GLOBAL_CONFIG.relativeDate?.homepage) {
                    relativeDate(document.querySelectorAll('#recent-posts time'));
                }
                GLOBAL_CONFIG.runtime && addRuntime();
                addLastPushDate();
                toggleCardCategory();
                scrollDownInIndex();
            }

            scrollFn();
            forPostFn();
            if (pageType !== 'shuoshuo') {
                btf?.switchComments && btf.switchComments(document);
            }
            openMobileMenu();
            bindRightSideEvents(); // 确保右侧按钮事件绑定
        };

        // --- 启动 ---

        btf?.addGlobalFn?.('pjaxComplete', refreshFn, 'refreshFn');
        refreshFn(); // 初始调用
        unRefreshFn(); // 绑定一次性事件

        // --- 处理加密文章事件 ---

        window.addEventListener('hexo-blog-decrypt', e => {
            forPostFn();
            window.translateFn?.translateInitialization && window.translateFn.translateInitialization();
            Object.values(window.globalFn?.encrypt || {}).forEach(fn => {
                fn && fn();
            });
        });

    });

})();
