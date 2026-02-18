# Chip Counter

## Purpose

Admin-only tool that uses Roboflow's object detection API to automatically count poker chips by color from a photo and calculate the total value in MXN. Replaces manual chip counting at end-of-session.

## Access

- Available from **Profile screen** (admin-only button: "Contador de Fichas")
- Route: `/chip-counter`

## UI Flow (4 Steps)

### Step 1: Seleccionar Imagen
- Uses the existing `pickMedia()` utility (camera or gallery)
- Extracts image dimensions via `ImageManipulator`

### Step 2: Dibujar Seleccion
- Full-screen image with Skia canvas overlay
- Freehand lasso drawing via pan gesture
- White stroke (2px) + dark outline (4px) for contrast on any background
- Semi-transparent green fill inside the selection
- Point thinning (min 3px distance) to avoid redundant points
- Buttons: "Limpiar" (clear) | "Confirmar" (proceed)

### Step 3: Vista Previa
- Skia offscreen render: clips original image with lasso path on white background
- Shows the masked result for user verification
- Compresses to max 1200px longest edge, JPEG quality 0.7 before API call
- Buttons: "Volver" (back to draw) | "Analizar" (send to API)

### Step 4: Resultados
- Original image with colored bounding boxes per detected chip
- Summary table: chip color, count, unit value, subtotal
- Grand total in MXN
- Low-confidence detections (< 0.4) are filtered with a note
- Buttons: "Reintentar" (start over) | "Cerrar" (close)

## Chip Value Mapping

| Roboflow Class | Label | Value (MXN) | Color |
|----------------|-------|-------------|-------|
| White PokerChip | Blanca | $5 | White |
| Red PokerChip | Roja | $10 | Red |
| Green PokerChip | Verde | $25 | Green |
| Blue PokerChip | Azul | $50 | Blue |
| Black PokerChip | Negra | $100 | Black |

## Configuration

Requires `EXPO_PUBLIC_ROBOFLOW_API_KEY` in `.env` file.

Roboflow model endpoint: `https://serverless.roboflow.com/poker-chip-count/2`

## Dependencies

- `@shopify/react-native-skia` - Canvas drawing, image masking, export
- `expo-image-manipulator` - Image resize before API call

## File Structure

```
types/chip-counter.ts              - Types and chip value mapping
services/chip-counter/roboflow.ts  - Roboflow API client + result aggregation
components/chip-counter/
  lasso-canvas.tsx                 - Skia canvas overlay for freehand lasso
  mask-preview.tsx                 - Offscreen render: masked image on white bg
  results-view.tsx                 - Detection results with bounding boxes + table
app/chip-counter.tsx               - Main route screen (step controller)
```
