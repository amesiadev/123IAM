# 123IAM Voice Serverless

## Objetivo

Servir audio TTS a 123IAM sin exponer la API key de OpenAI en GitHub Pages.

## Backend

El endpoint está en `api/voice.mjs` y está preparado para desplegarse como Vercel Function.

Variables requeridas:

- `OPENAI_API_KEY`: obligatoria y solo del lado servidor.
- `OPENAI_TTS_MODEL`: opcional; por defecto `gpt-4o-mini-tts`.
- `OPENAI_TTS_VOICE`: opcional; por defecto `coral`.
- `OPENAI_TTS_INSTRUCTIONS`: opcional; instrucciones base de dicción.
- `IAM_ALLOWED_ORIGINS`: opcional; lista de orígenes adicionales separados por coma.

El origen de GitHub Pages `https://amesiadev.github.io` ya está permitido.

## Frontend

`voice.js` usa `RemoteTTSProvider` cuando existe un endpoint configurado y mantiene `NativeSpeechAdapter` como fallback.

Si toda la aplicación se ejecuta desde Vercel, `voice.js` utiliza automáticamente `/api/voice`.

Si el frontend continúa en GitHub Pages, después de desplegar la función se debe configurar en `index.html`:

```html
<meta name="iam-voice-endpoint" content="https://TU-DOMINIO-VERCEL/api/voice">
```

Mientras ese valor esté vacío, GitHub Pages continúa usando `speechSynthesis` mediante el fallback y el juego conserva su comportamiento actual.

## Contrato

`POST /api/voice`

```json
{
  "text": "¡Hola! Soy IAM.",
  "context": "default"
}
```

Respuesta correcta: `audio/mpeg`.

Contextos admitidos actualmente: `default`, `welcome`, `question`, `success`, `retry`, `hint`, `celebration`.

La personalización fonética de IAM y los contextos emocionales se implementarán en PR-VOICE-03.
