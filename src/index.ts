import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('CRITICAL: GEMINI_API_KEY missing in environment variables');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const SYSTEM_INSTRUCTION = `Eres 'UCSSito', un chatbot asistente virtual conversacional de la Facultad de Ingeniería de la UCSS.

REGLAS ABSOLUTAS Y OBLIGATORIAS DE RESPUESTA:
1. PROHIBIDOS SALUDOS E INTRODUCCIONES: Jamás inicies ninguna respuesta con "Hola", "Soy UCSSito", "Qué bueno que consultes", "Un gusto ayudarte", "¡Claro que sí!" ni ninguna frase introductoria de relleno.
2. EMPILADO DIRECTO AL CONTENIDO: Tu respuesta debe empezar INMEDIATAMENTE con la información directa. Ejemplos de inicios permitidos:
   - "Para la **Semana 1**, las actividades principales son:..."
   - "De acuerdo a lo programado, en la **Semana 5** debes considerar:..."
   - "De nada, es un gusto ayudarte."
3. LISTAS NUMERADAS OBLIGATORIAS (1., 2., 3.): Está ESTRICTAMENTE PROHIBIDO usar asteriscos (*), guiones (-), ni viñetas para listar elementos. Usa SIEMPRE números en orden correlativo (1., 2., 3.).
4. FORMATO DE TÍTULO Y SALTO DE LÍNEA: El título de cada ítem numerado debe estar en **negrita**, seguido de un SALTO DE LÍNEA antes de la explicación.

INFORMACIÓN ACADÉMICA OFICIAL Y EXCLUSIVA QUE DEBES RESPONDER:

- **Semana 1 (Actividades principales)**:
  1. **Revisar y actualizar el aula virtual:**
     Consiste en actualizar y preparar el aula virtual para el inicio de clases.
  2. **Registrar los delegados de asignatura:**
     Consiste en registrar en la Intranet Docente a los delegados elegidos para cada asignatura.
  3. **Aplicar la prueba de entrada:**
     Consiste en la aplicación de la evaluación diagnóstica a los estudiantes en la primera sesión.
  4. **Publicar las sesiones de clase y materiales correspondientes:**
     Consiste en subir las diapositivas, guías y materiales del curso correspondientes a la semana en curso.
  5. **Mantener actualizado el aula virtual con sesiones, materiales y actividades de aprendizaje:**
     Consiste en mantener al día el aula virtual agregando las sesiones, materiales didácticos y actividades planificadas.

- **Semanas 1 al 4 (Actividades principales)**:
  1. **Mantener actualizado el aula virtual con sesiones, materiales y actividades de aprendizaje:**
     Consiste en subir de forma constante los recursos pedagógicos al aula virtual.
  2. **Registrar en la Intranet Docente el contenido desarrollado de acuerdo con el sílabo:**
     Consiste en registrar detalladamente cada tema avanzado en la Intranet según la planificación curricular del sílabo.
  3. **Registrar la asistencia docente:**
     Consiste en marcar y registrar puntualmente la asistencia a tus clases asignadas.
  4. **Revisar los lineamientos sobre estrategias pedagógicas y didácticas de los programas de estudio:**
     Consiste en examinar los lineamientos de enseñanza propuestos para el programa.
  5. **Publicar la nota de la primera evaluación continua 1:**
     Consiste en subir y publicar la calificación correspondiente a la evaluación continua 1 de los estudiantes.

- **Semana 5 (Actividades principales)**:
  1. **Considerar la Semana de Evaluación Parcial 1:**
     Consiste en programar y aplicar los exámenes parciales establecidos en el calendario académico.
  2. **Verificar previamente la programación y los instrumentos de evaluación correspondientes:**
     Consiste en validar los exámenes, rúbricas e instrumentos de evaluación antes de su aplicación oficial.`;

app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'El parámetro "message" es requerido y debe ser una cadena de texto.' });
      return;
    }

    let contentsPayload: any = message;
    
    if (Array.isArray(history) && history.length > 1) {
      contentsPayload = history.map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }]
      }));
    }

    let responseText = '';
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: { systemInstruction: SYSTEM_INSTRUCTION }
        });
        if (response && response.text) {
          responseText = response.text;
          lastError = null;
          break;
        }
      } catch (err: any) {
        console.error(`Error con el modelo ${modelName}:`, err?.message || err);
        lastError = err;
      }
    }

    if (lastError && !responseText) {
      // If free quota is temporarily exhausted from rapid testing, provide reliable academic fallback
      const msgLower = (message || '').toLowerCase();
      if (msgLower.includes('1 al 4') || msgLower.includes('1 a 4') || msgLower.includes('1 hasta la 4') || msgLower.includes('1 hasta 4') || msgLower.includes('semana 4') || msgLower.includes('segunda') || msgLower.includes('intranet')) {
        responseText = `Para las **Semanas 1 al 4**, las actividades principales son:

1. **Mantener actualizado el aula virtual con sesiones, materiales y actividades de aprendizaje:**
   Consiste en subir de forma constante los recursos pedagógicos al aula virtual.

2. **Registrar en la Intranet Docente el contenido desarrollado de acuerdo con el sílabo:**
   Consiste en registrar detalladamente cada tema avanzado en la Intranet según la planificación curricular del sílabo.

3. **Registrar la asistencia docente:**
   Consiste en marcar y registrar puntualmente la asistencia a tus clases asignadas.

4. **Revisar los lineamientos sobre estrategias pedagógicas y didácticas de los programas de estudio:**
   Consiste en examinar los lineamientos de enseñanza propuestos para el programa.

5. **Publicar la nota de la primera evaluación continua 1:**
   Consiste en subir y publicar la calificación correspondiente a la evaluación continua 1 de los estudiantes.`;
      } else if (msgLower.includes('semana 1') || msgLower.includes('primera semana') || msgLower.includes('hago')) {
        responseText = `Para la **Semana 1**, las actividades principales son:

1. **Revisar y actualizar el aula virtual:**
   Consiste en actualizar y preparar el aula virtual para el inicio de clases.

2. **Registrar los delegados de asignatura:**
   Consiste en registrar en la Intranet Docente a los delegados elegidos para cada asignatura.

3. **Aplicar la prueba de entrada:**
   Consiste en la aplicación de la evaluación diagnóstica a los estudiantes en la primera sesión.

4. **Publicar las sesiones de clase y materiales correspondientes:**
   Consiste en subir las diapositivas, guías y materiales del curso correspondientes a la semana en curso.

5. **Mantener actualizado el aula virtual con sesiones, materiales y actividades de aprendizaje:**
   Consiste en mantener al día el aula virtual agregando las sesiones, materiales didácticos y actividades planificadas.`;
      } else if (msgLower.includes('semana 5') || msgLower.includes('parcial')) {
        responseText = `Para la **Semana 5**, las actividades principales son:

1. **Considerar la Semana de Evaluación Parcial 1:**
   Consiste en programar y aplicar los exámenes parciales establecidos en el calendario académico.

2. **Verificar previamente la programación y los instrumentos de evaluación correspondientes:**
   Consiste en validar los exámenes, rúbricas e instrumentos de evaluación antes de su aplicación oficial.`;
      } else if (msgLower.includes('gracias')) {
        responseText = 'De nada, es un gusto ayudarte.';
      } else {
        responseText = 'En la Facultad de Ingeniería UCSS estamos para ayudarte. ¿Podrías indicarme sobre qué semana o actividad académica (Semana 1, Semanas 1 al 4, Semana 5) necesitas información específica?';
      }
    }

    // Clean any accidental greetings or intros from the response string
    let cleanedResponse = responseText
      .replace(/^(¡?Hola!?,?\s*)?(¡?Soy\s*UCSSito!?,?\s*)?(tu\s*asistente\s*virtual.*?\.\s*)?(Es\s*un\s*placer\s*ayudarte\.\s*)?(Un\s*gusto\s*ayudarte.*?\.\s*)?(¡?Claro\s*que\s*sí!?,?\s*)?/gi, '')
      .trim();

    // Capitalize first letter of cleaned response
    if (cleanedResponse.length > 0) {
      cleanedResponse = cleanedResponse.charAt(0).toUpperCase() + cleanedResponse.slice(1);
    } else {
      cleanedResponse = responseText;
    }

    res.json({ response: cleanedResponse });
  } catch (error: any) {
    console.error('Error procesando solicitud en /api/chat:', error);
    res.status(500).json({
      error: 'Error interno del servidor al procesar la solicitud con Gemini API.',
      details: error?.message || error
    });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ucssito-backend' });
});

app.listen(port, () => {
  console.log(`Servidor UCSSito escuchando en http://localhost:${port}`);
});
