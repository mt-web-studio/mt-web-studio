/**
 * Portfolio Site - スクリプト
 * - ハンバーガーメニューの開閉
 * - 現在表示中セクションのナビ表示
 * - お問い合わせフォームのバリデーションと擬似送信
 * - 公開URL未設定のWorksリンク（aria-disabled）を無効化
 *
 * スムーススクロールは CSS の `scroll-behavior: smooth`
 * （`prefers-reduced-motion` 時は自動的に無効化）で実現しており、
 * ここでは重複した実装を行わない。
 */
(function () {
  "use strict";

  initNavToggle();
  initActiveSectionNav();
  initDisabledLinks();
  initContactForm();

  /**
   * モバイル用ハンバーガーメニューの開閉制御
   */
  function initNavToggle() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("siteNav");

    if (!toggle || !nav) {
      return;
    }

    toggle.addEventListener("click", function () {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      setNavOpen(!isOpen);
    });

    nav.querySelectorAll(".site-nav__link").forEach(function (link) {
      link.addEventListener("click", function () {
        setNavOpen(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (event.key === "Escape" && isOpen) {
        setNavOpen(false);
        toggle.focus();
      }
    });

    function setNavOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    }
  }

  /**
   * 表示中のセクションに応じて、対応するナビリンクに aria-current="true" を付与
   */
  function initActiveSectionNav() {
    const links = document.querySelectorAll(".site-nav__link[href^='#']");
    if (!links.length || !("IntersectionObserver" in window)) {
      return;
    }

    const sections = Array.from(links)
      .map(function (link) {
        const id = link.getAttribute("href").slice(1);
        return document.getElementById(id);
      })
      .filter(Boolean);

    if (!sections.length) {
      return;
    }

    const linkBySectionId = new Map();
    links.forEach(function (link) {
      linkBySectionId.set(link.getAttribute("href").slice(1), link);
    });

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          const link = linkBySectionId.get(entry.target.id);
          if (!link) {
            return;
          }
          if (entry.isIntersecting) {
            links.forEach(function (l) {
              l.removeAttribute("aria-current");
            });
            link.setAttribute("aria-current", "true");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /**
   * 公開URL未設定の Works リンク（aria-disabled="true"）のクリックを無効化する。
   * href を実際のURLに差し替え、aria-disabled を外すだけで有効なリンクになる。
   */
  function initDisabledLinks() {
    document.querySelectorAll('a[aria-disabled="true"]').forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (link.getAttribute("aria-disabled") === "true") {
          event.preventDefault();
        }
      });
    });
  }

  /**
   * お問い合わせフォームのクライアント側バリデーションと擬似送信
   */
  function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) {
      return;
    }

    const statusBox = document.getElementById("formStatus");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const fields = [
      {
        input: form.elements.namedItem("name"),
        errorId: "nameError",
        validate: function (value) {
          return value.trim() !== "" ? "" : "お名前を入力してください。";
        },
      },
      {
        input: form.elements.namedItem("email"),
        errorId: "emailError",
        validate: function (value) {
          if (value.trim() === "") {
            return "メールアドレスを入力してください。";
          }
          return emailPattern.test(value.trim())
            ? ""
            : "メールアドレスの形式が正しくありません。";
        },
      },
      {
        input: form.elements.namedItem("message"),
        errorId: "messageError",
        validate: function (value) {
          return value.trim() !== "" ? "" : "ご相談内容を入力してください。";
        },
      },
    ];

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      let firstInvalid = null;
      let hasError = false;

      fields.forEach(function (field) {
        if (!field.input) {
          return;
        }
        const message = field.validate(field.input.value);
        const errorEl = document.getElementById(field.errorId);

        if (message) {
          hasError = true;
          field.input.setAttribute("aria-invalid", "true");
          if (errorEl) {
            errorEl.textContent = message;
          }
          if (!firstInvalid) {
            firstInvalid = field.input;
          }
        } else {
          field.input.removeAttribute("aria-invalid");
          if (errorEl) {
            errorEl.textContent = "";
          }
        }
      });

      if (hasError) {
        showStatus("入力内容をご確認ください。", "error");
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      const data = {
        name: form.elements.namedItem("name").value.trim(),
        email: form.elements.namedItem("email").value.trim(),
        message: form.elements.namedItem("message").value.trim(),
      };

      submitInquiry(data).then(function () {
        showStatus(
          "お問い合わせを受け付けました（本サイトはポートフォリオのため、実際には送信されません）。",
          "success"
        );
        form.reset();
        fields.forEach(function (field) {
          if (field.input) {
            field.input.removeAttribute("aria-invalid");
          }
          const errorEl = document.getElementById(field.errorId);
          if (errorEl) {
            errorEl.textContent = "";
          }
        });
      });
    });

    function showStatus(message, type) {
      if (!statusBox) {
        return;
      }
      statusBox.textContent = message;
      statusBox.classList.remove("form-status--success", "form-status--error");
      statusBox.classList.add(
        type === "success" ? "form-status--success" : "form-status--error"
      );
    }
  }

  /**
   * 問い合わせデータの送信処理。
   * 現在はポートフォリオ用の擬似送信のみを行う。
   * 実運用に切り替える際は、この関数の中身を実際のAPI呼び出しや
   * メール送信サービスへのリクエストに差し替える。
   */
  function submitInquiry(data) {
    return Promise.resolve(data);
  }
})();
