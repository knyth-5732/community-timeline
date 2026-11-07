(() => {
  const cfg = window.APP_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const loginPanel = $("loginPanel");
  const timelinePanel = $("timelinePanel");
  const submitPanel = $("submitPanel");
  const logoutBtn = $("logoutBtn");

  const supabaseReady =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
    !cfg.SUPABASE_ANON_KEY.includes("YOUR_");

  let db = null;
  let timeline = null;
  let items = null;

  function message(id, text, bad = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("error", bad);
  }

  function show(el, yes) {
    if (el) el.classList.toggle("hidden", !yes);
  }

  function getSubmitToken() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    return params.get("post");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function initTimeline() {
    const container = $("timeline");
    items = new vis.DataSet([]);

    const options = {
      width: "100%",
      height: "390px",
      zoomMin: 1000 * 60 * 60 * 24,
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 300,
      moveable: true,
      zoomable: true,
      selectable: true,
      stack: true,
      showCurrentTime: true,
      orientation: { axis: "bottom", item: "top" },
      margin: {
        item: { horizontal: 12, vertical: 14 },
        axis: 12
      },
      format: {
        minorLabels: {
          millisecond: "SSS",
          second: "s",
          minute: "HH:mm",
          hour: "HH:mm",
          weekday: "M/d",
          day: "M/d",
          week: "M/d",
          month: "yyyy年M月",
          year: "yyyy年"
        },
        majorLabels: {
          millisecond: "",
          second: "",
          minute: "yyyy年M月d日",
          hour: "yyyy年M月d日",
          weekday: "yyyy年M月",
          day: "yyyy年M月",
          week: "yyyy年M月",
          month: "yyyy年",
          year: ""
        }
      }
    };

    timeline = new vis.Timeline(container, items, options);

    timeline.on("select", (props) => {
      const item = props.items.length
        ? items.get(props.items[0])
        : null;

      const panel = $("eventDetail");

      if (!item) {
        show(panel, false);
        return;
      }

      $("detailTitle").textContent = item.content;
      $("detailMeta").textContent =
        `${item.dateLabel} · ${item.category || "その他"} · ${item.author || "匿名"}`;
      $("detailDescription").textContent =
        item.description || "説明はありません。";

      show(panel, true);
    });
  }

  async function loadEvents() {
    const { data, error } = await db
      .from("events")
      .select("id,title,happened_at,description,category,author,created_at")
      .order("happened_at", { ascending: true });

    if (error) throw error;

    items.clear();

    items.add((data || []).map((e) => {
      const d = new Date(e.happened_at);

      return {
        id: e.id,
        start: d,
        content: escapeHtml(e.title),
        title: escapeHtml(e.title),
        dateLabel: d.toLocaleDateString("ja-JP"),
        description: e.description || "",
        category: e.category || "その他",
        author: e.author || "匿名",
        className: "event-pin"
      };
    }));

    if (data && data.length) {
      timeline.fit({ animation: false });
    }
  }

  // ログイン不要。誰でも年表を閲覧できる。
  show(loginPanel, false);
  show(logoutBtn, false);

  if (!supabaseReady) {
    show(timelinePanel, true);
    timelinePanel.innerHTML = `
      <div class="panel narrow">
        <h2>セットアップが必要です</h2>
        <p class="muted">
          config.js に Supabase URL と公開キーを設定してください。
        </p>
      </div>
    `;
  } else {
    db = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY
    );

    show(timelinePanel, true);

    initTimeline();

    $("reloadBtn").addEventListener("click", () => {
      loadEvents().catch((e) => {
        console.error(e);
        alert("年表を再読み込みできませんでした。");
      });
    });

    loadEvents().catch((e) => {
      console.error(e);
      alert("年表を読み込めませんでした。Supabaseの設定とRLSを確認してください。");
    });
  }

  // 専用URLから開いた場合だけ投稿フォームを表示する。
  if (getSubmitToken()) {
    show(submitPanel, true);
    show(loginPanel, false);
    show(timelinePanel, false);
    show(logoutBtn, false);

    $("eventDate").value = new Date().toISOString().slice(0, 10);

    $("eventForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();

      if (!supabaseReady) {
        message("submitMessage", "Supabase設定が必要です。", true);
        return;
      }

      const token = getSubmitToken();

      const payload = {
        token,
        title: $("eventTitle").value.trim(),
        happened_at: $("eventDate").value,
        category: $("eventCategory").value,
        author: $("eventAuthor").value.trim(),
        description: $("eventDescription").value.trim()
      };

      message("submitMessage", "投稿中…");

      try {
        const response = await fetch(
          `${cfg.SUPABASE_URL}/functions/v1/submit-event`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": cfg.SUPABASE_ANON_KEY
            },
            body: JSON.stringify(payload)
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "投稿できませんでした。");
        }

        $("eventForm").reset();
        $("eventDate").value = new Date().toISOString().slice(0, 10);

        message(
          "submitMessage",
          "投稿しました！年表に反映されます。"
        );
      } catch (e) {
        message("submitMessage", e.message, true);
      }
    });
  }
})();
