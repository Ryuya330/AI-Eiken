// Firebase Functionsライブラリをインポート
const functions = require("firebase-functions");
const fetch = require("node-fetch");

// ★★★★★ 変更点 ★★★★★
// 新しい方法(.envファイル)でAPIキーを読み込むようにします
// require("dotenv").config(); // .envファイルを使うためにこの行を追加

// Google AIへのリクエストを中継する関数を定義
// v2にアップデートし、環境変数の設定を簡素化
exports.generateContentProxy = functions.runWith({ secrets: ["GOOGLE_APIKEY"] }).https.onRequest(async (req, res) => {
  // CORS設定: どのウェブサイトからでもこの関数を呼び出せるように許可する
  // 本番環境では特定のドメインに限定することを推奨します
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // OPTIONSメソッド（プリフライトリクエスト）への対応
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // ★★★★★ 変更点 ★★★★★
  // APIキーを安全な環境変数から取得します
  // functions.config() の代わりに process.env を使います
  const apiKey = process.env.GOOGLE_APIKEY;
  if (!apiKey) {
    console.error("Google API Key not set as a secret.");
    res.status(500).send("APIキーがサーバーに設定されていません。");
    return;
  }

  // リクエストの種類（テキスト、画像、音声）を取得
  const { target, payload } = req.body;
  let apiUrl;

  switch (target) {
    case "text":
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
      break;
    case "image":
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
      break;
    case "audio":
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
      break;
    default:
      res.status(400).send("無効なターゲットです。");
      return;
  }

  try {
    // フロントエンドから受け取ったpayloadを使ってGoogleのAPIにリクエストを送信
    const googleApiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!googleApiResponse.ok) {
      const errorBody = await googleApiResponse.text();
      console.error("Google API Error:", errorBody);
      throw new Error(`API request failed with status ${googleApiResponse.status}`);
    }

    const data = await googleApiResponse.json();

    // Google APIからのレスポンスをそのままフロントエンドに返す
    res.status(200).json(data);

  } catch (error) {
    console.error("Proxy function error:", error);
    res.status(500).send("サーバーでエラーが発生しました。");
  }
});
