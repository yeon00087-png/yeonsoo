/* 1920 × 1080 데스크톱 비례 축소 */
const DESKTOP_BASE_WIDTH = 1920;
const DESKTOP_BASE_HEIGHT = 1080;

function updateDesktopScale() {
    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const scale = Math.min(
        viewportWidth / DESKTOP_BASE_WIDTH,
        viewportHeight / DESKTOP_BASE_HEIGHT,
        1
    );
    document.documentElement.style.setProperty("--desktop-scale", scale.toFixed(5));
}

updateDesktopScale();
window.addEventListener("resize", updateDesktopScale, { passive: true });
window.addEventListener("orientationchange", updateDesktopScale);
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateDesktopScale, { passive: true });
}

/* =========================================
   INTRO
========================================= */
const introVideoEl = document.getElementById("introVideo");
const introScreenEl = document.querySelector(".intro-screen");
const mainContentEl = document.querySelector(".main-content");
const introSkipButtonEl = document.getElementById("introSkipButton");
let introFinished = false;

function openMainScreen() {
    if (introFinished || !introScreenEl || !mainContentEl) return;
    introFinished = true;
    if (introVideoEl) introVideoEl.pause();
    introScreenEl.classList.add("hide");
    mainContentEl.classList.add("show");
}

introVideoEl?.addEventListener("ended", openMainScreen, { once: true });
introSkipButtonEl?.addEventListener("click", openMainScreen);

/* =========================================
   ELEMENTS
========================================= */
const projectFolder = document.getElementById("projectFolder");
const resumeFolderEl = document.getElementById("resumeFolder");
const trashIcon = document.getElementById("trashIcon");

const projectWindow = document.getElementById("projectWindow");
const projectCloseButton = document.getElementById("projectCloseButton");
const projectWindowStatus = document.getElementById("projectWindowStatus");

const projectDetailWindow = document.getElementById("projectDetailWindow");
const projectDetailCloseButton = document.getElementById("projectDetailCloseButton");
const projectDetailFiles = document.getElementById("projectDetailFiles");
const projectDetailStatus = document.getElementById("projectDetailStatus");

const videoWindow = document.getElementById("videoWindow");
const videoCloseButton = document.getElementById("videoCloseButton");
const portfolioVideo = document.getElementById("portfolioVideo");

const docViewerWindow = document.getElementById("docViewerWindow");
const docViewerScrollArea = document.getElementById("docViewerScrollArea");
const docViewerImage = document.getElementById("docViewerImage");
const docViewerCloseButton = document.getElementById("docViewerCloseButton");

const resumeWindowEl = document.getElementById("resumeWindow");
const resumeCloseButtonEl = document.getElementById("resumeCloseButton");

const taskbarWindowList = document.getElementById("taskbarWindowList");
const taskbarClock = document.getElementById("taskbarClock");
const taskbarStartButton = document.getElementById("taskbarStartButton");

const projectFolderButtons = document.querySelectorAll(".project-folder-button");

/* =========================================
   WINDOW MANAGER
   - 클릭한 창 앞으로
   - 최소화/복원
   - 작업표시줄 버튼 자동 생성
========================================= */
let highestZ = 2000;
let activeWindowId = null;

const managedWindows = Array.from(document.querySelectorAll(".managed-window"));

function isWindowOpen(win) {
    return Boolean(win?.classList.contains("show"));
}

function isWindowMinimized(win) {
    return Boolean(win?.classList.contains("is-minimized"));
}

function getWindowTitle(win) {
    return win?.dataset.windowTitle || "Window";
}

function setWindowTitle(win, title) {
    if (!win || !title) return;
    win.dataset.windowTitle = title;
    const taskButton = taskbarWindowList?.querySelector(`[data-task-window="${win.id}"]`);
    if (taskButton) taskButton.textContent = title;
}

function ensureTaskbarButton(win) {
    if (!taskbarWindowList || !win?.id) return;
    let button = taskbarWindowList.querySelector(`[data-task-window="${win.id}"]`);
    if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "taskbar-window-button";
        button.dataset.taskWindow = win.id;
        button.addEventListener("click", () => {
            if (!isWindowOpen(win)) return;
            if (isWindowMinimized(win)) {
                restoreWindow(win);
            } else if (activeWindowId === win.id) {
                minimizeWindow(win);
            } else {
                bringToFront(win);
            }
        });
        taskbarWindowList.append(button);
    }
    button.textContent = getWindowTitle(win);
}

function removeTaskbarButton(win) {
    taskbarWindowList?.querySelector(`[data-task-window="${win?.id}"]`)?.remove();
}

function refreshTaskbarActiveState() {
    taskbarWindowList?.querySelectorAll(".taskbar-window-button").forEach((button) => {
        const win = document.getElementById(button.dataset.taskWindow);
        button.classList.toggle(
            "is-active",
            Boolean(win && win.id === activeWindowId && !isWindowMinimized(win))
        );
    });
}

function bringToFront(win) {
    if (!win || !isWindowOpen(win) || isWindowMinimized(win)) return;
    highestZ += 1;
    win.style.zIndex = String(highestZ);
    activeWindowId = win.id;
    ensureTaskbarButton(win);
    refreshTaskbarActiveState();
}

function openManagedWindow(win) {
    if (!win) return;
    win.classList.add("show");
    win.classList.remove("is-minimized");
    win.setAttribute("aria-hidden", "false");
    ensureTaskbarButton(win);
    bringToFront(win);
}

function minimizeWindow(win) {
    if (!win || !isWindowOpen(win)) return;
    win.classList.add("is-minimized");
    win.setAttribute("aria-hidden", "true");
    if (activeWindowId === win.id) activeWindowId = null;
    refreshTaskbarActiveState();
}

function restoreWindow(win) {
    if (!win || !isWindowOpen(win)) return;
    win.classList.remove("is-minimized");
    win.setAttribute("aria-hidden", "false");
    bringToFront(win);
}

function closeManagedWindow(win) {
    if (!win) return;
    win.classList.remove("show", "is-minimized");
    win.setAttribute("aria-hidden", "true");
    win.style.removeProperty("z-index");
    removeTaskbarButton(win);
    if (activeWindowId === win.id) activeWindowId = null;
    refreshTaskbarActiveState();
}

managedWindows.forEach((win) => {
    win.addEventListener("pointerdown", () => bringToFront(win));
});

document.querySelectorAll(".window-minimize-button").forEach((button) => {
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        minimizeWindow(document.getElementById(button.dataset.windowTarget));
    });
});

/* =========================================
   SELECT / DOUBLE CLICK
   데스크톱: 1클릭 선택, 더블클릭 실행
   터치: 1탭 실행
========================================= */
function clearSelection(scope = document) {
    scope.querySelectorAll?.(".is-selected").forEach((el) => el.classList.remove("is-selected"));
}

function makeSelectableOpenable(element, openAction, scope = document) {
    if (!element) return;

    element.addEventListener("click", (event) => {
        if (event.detail > 1) return;
        clearSelection(scope);
        element.classList.add("is-selected");
    });

    element.addEventListener("dblclick", (event) => {
        event.preventDefault();
        openAction();
    });

    element.addEventListener("pointerup", (event) => {
        if (event.pointerType === "touch") openAction();
    });

    element.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            openAction();
        }
    });
}

makeSelectableOpenable(projectFolder, () => openManagedWindow(projectWindow), mainContentEl || document);
makeSelectableOpenable(resumeFolderEl, () => openManagedWindow(resumeWindowEl), mainContentEl || document);

/* 휴지통은 전용 창 이미지/내용 소스가 아직 없으므로 선택까지만 적용 */
if (trashIcon) {
    trashIcon.addEventListener("click", () => {
        clearSelection(mainContentEl || document);
        trashIcon.classList.add("is-selected");
    });
}

/* =========================================
   PROJECT FOLDER DATA
========================================= */
const projectData = {
    dangdang: {
        video: {
            title: "FINAL.mp4",
            src: "video/댕댕투어패스광고.mp4",
            icon: "icons/댕댕투어패스-아이콘.png"
        },
        document: {
            title: "PLANNING & STORYBOARD.png",
            src: "document/댕댕투어패스-기획서_스토리보드.png.png",
            icon: "icons/댕댕투어패스기획서.png"
        }
    },
    topup: {
        video: {
            title: "FINAL.mp4",
            src: "video/에너지바광고.mp4",
            icon: "icons/2차과제아이콘.png"
        },
        document: {
            title: "PLANNING & STORYBOARD.png",
            src: "document/에너지바-기획서-스토리보드.png.png",
            icon: "icons/에너지바기획서.png"
        }
    },
    yogurt: {
        video: {
            title: "FINAL.mp4",
            src: "video/요거트월드광고.mp4",
            icon: "icons/3차과제아이콘.png"
        },
        document: {
            title: "PLANNING & STORYBOARD.png",
            src: "document/요거트월드-기획서-스토리보드.png.png",
            icon: "icons/요거트월드기획서.png"
        }
    },
    cinebeam: {
        video: {
            title: "FINAL.mp4",
            src: "video/LG시네빔광고.mp4",
            icon: "icons/조별과제아이콘.png"
        },
        document: {
            title: "PLANNING & STORYBOARD.png",
            src: "document/시네빔-기획서-스토리보드.png.png",
            icon: "icons/시네빔기획서.png"
        }
    }
};

const projectNames = {
    dangdang: "DANGDANG TOUR PASS",
    topup: "TOPUP",
    yogurt: "YOGURT WORLD",
    cinebeam: "LG CINEBEAM"
};

function setStatus(element, text) {
    if (element) element.textContent = text;
}

function createProjectFileButton(type, file) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = type === "video" ? "video-file-button" : "doc-file-button";

    if (type === "video") {
        button.dataset.video = file.src;
        button.dataset.title = file.title;
    } else {
        button.dataset.doc = file.src;
        button.dataset.title = file.title;
    }

    const image = document.createElement("img");
    image.src = file.icon;
    image.alt = `${file.title} 열기`;
    button.append(image);

    button.addEventListener("click", (event) => {
        if (event.detail > 1) return;
        clearSelection(projectDetailFiles);
        button.classList.add("is-selected");
        setStatus(projectDetailStatus, file.title);
    });

    button.addEventListener("dblclick", () => {
        if (type === "video") openPortfolioVideo(button);
        else openPortfolioDocument(button);
    });

    button.addEventListener("pointerup", (event) => {
        if (event.pointerType !== "touch") return;
        if (type === "video") openPortfolioVideo(button);
        else openPortfolioDocument(button);
    });

    button.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        if (type === "video") openPortfolioVideo(button);
        else openPortfolioDocument(button);
    });

    return button;
}

function openProjectDetail(projectKey) {
    const data = projectData[projectKey];
    if (!data || !projectDetailWindow || !projectDetailFiles) return;

    projectDetailFiles.replaceChildren(
        createProjectFileButton("video", data.video),
        createProjectFileButton("document", data.document)
    );

    const projectName = projectNames[projectKey] || "PROJECT";
    /* 창 이미지 위에 제목 텍스트는 추가하지 않고, 작업표시줄 이름에만 사용 */
    setWindowTitle(projectDetailWindow, projectName);
    setStatus(projectDetailStatus, "2 object(s)");
    openManagedWindow(projectDetailWindow);
}

function closeProjectDetail() {
    closeManagedWindow(projectDetailWindow);
    clearSelection(projectDetailFiles);
    setStatus(projectDetailStatus, "2 object(s)");
}

projectFolderButtons.forEach((button) => {
    makeSelectableOpenable(
        button,
        () => openProjectDetail(button.dataset.project),
        document.querySelector(".project-folder-list") || projectWindow
    );

    button.addEventListener("click", () => {
        const key = button.dataset.project;
        setStatus(projectWindowStatus, projectNames[key] || "1 object selected");
    });
});

/* =========================================
   VIDEO / DOCUMENT
========================================= */
function openPortfolioVideo(button) {
    const videoPath = button?.dataset?.video;
    if (!videoPath || !portfolioVideo || !videoWindow) return;

    portfolioVideo.pause();
    portfolioVideo.src = videoPath;
    portfolioVideo.load();
    setWindowTitle(videoWindow, button.dataset.title || "MEDIA PLAYER");
    openManagedWindow(videoWindow);
}

function closePortfolioVideo() {
    if (portfolioVideo) {
        portfolioVideo.pause();
        portfolioVideo.removeAttribute("src");
        portfolioVideo.load();
    }
    closeManagedWindow(videoWindow);
}

function openPortfolioDocument(button) {
    const documentPath = button?.dataset?.doc;
    const documentTitle = button?.dataset?.title || "DOCUMENT";
    if (!documentPath || !docViewerWindow || !docViewerImage || !docViewerScrollArea) return;

    docViewerScrollArea.scrollTop = 0;
    docViewerImage.onerror = () => console.error(`문서 파일을 불러오지 못했습니다: ${documentPath}`);
    docViewerImage.onload = () => { docViewerImage.onerror = null; };
    docViewerImage.src = documentPath;
    docViewerImage.alt = documentTitle;
    setWindowTitle(docViewerWindow, documentTitle);
    openManagedWindow(docViewerWindow);
}

function closeDocViewer() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    closeManagedWindow(docViewerWindow);
    if (docViewerImage) {
        docViewerImage.removeAttribute("src");
        docViewerImage.alt = "기획서와 스토리보드";
    }
    if (docViewerScrollArea) docViewerScrollArea.scrollTop = 0;
}

videoCloseButton?.addEventListener("click", closePortfolioVideo);
docViewerCloseButton?.addEventListener("click", closeDocViewer);

/* =========================================
   CLOSE BUTTONS
========================================= */
projectCloseButton?.addEventListener("click", () => {
    closeProjectDetail();
    closeManagedWindow(projectWindow);
    clearSelection(document.querySelector(".project-folder-list") || projectWindow);
    setStatus(projectWindowStatus, "4 object(s)");
});

projectDetailCloseButton?.addEventListener("click", closeProjectDetail);
resumeCloseButtonEl?.addEventListener("click", () => closeManagedWindow(resumeWindowEl));

/* =========================================
   BACK NAVIGATION
   프로젝트 상세 폴더에서는 Backspace / Alt+← 로 상위 폴더 이동
========================================= */
document.addEventListener("keydown", (event) => {
    const wantsBack = event.key === "Backspace" || (event.altKey && event.key === "ArrowLeft");
    if (!wantsBack) return;
    if (isWindowOpen(projectDetailWindow) && !isWindowMinimized(projectDetailWindow)) {
        event.preventDefault();
        closeProjectDetail();
        bringToFront(projectWindow);
    }
});

/* =========================================
   ESC: 현재 가장 앞에 있는 창부터 닫기
========================================= */
function getTopmostVisibleWindow() {
    return managedWindows
        .filter((win) => isWindowOpen(win) && !isWindowMinimized(win))
        .sort((a, b) => (Number(b.style.zIndex) || 0) - (Number(a.style.zIndex) || 0))[0] || null;
}

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const top = getTopmostVisibleWindow();
    if (!top) return;

    if (top === videoWindow) closePortfolioVideo();
    else if (top === docViewerWindow) closeDocViewer();
    else if (top === projectDetailWindow) closeProjectDetail();
    else if (top === projectWindow) projectCloseButton?.click();
    else if (top === resumeWindowEl) closeManagedWindow(resumeWindowEl);
});

/* =========================================
   TASKBAR CLOCK
========================================= */
function updateTaskbarClock() {
    if (!taskbarClock) return;
    const now = new Date();
    taskbarClock.dateTime = now.toISOString();
    taskbarClock.textContent = new Intl.DateTimeFormat("ko-KR", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    }).format(now);
}

updateTaskbarClock();
setInterval(updateTaskbarClock, 1000 * 30);

/* START 메뉴는 사용자가 준비할 전용 메뉴 이미지가 아직 없으므로
   버튼 클릭영역만 먼저 연결해 둡니다. 이미지 추가 시 이 이벤트에 메뉴 토글만 붙이면 됩니다. */
taskbarStartButton?.addEventListener("click", () => {
    taskbarStartButton.classList.toggle("is-pressed");
});

/* 바탕화면 빈 곳을 클릭하면 선택 해제 */
mainContentEl?.addEventListener("pointerdown", (event) => {
    if (event.target === mainContentEl) clearSelection(mainContentEl);
});
