import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = "AIzaSyCL-Qp3LMPCrQrQA_QJ0TG-rtVOybu5Sco";

// DOM Elements
const form = document.getElementById('lesson-plan-form');
const submitButton = form.querySelector('button[type="submit"]');
const gradeLevelSelect = document.getElementById('gradeLevel');

// View Containers
const spinnerContainer = document.getElementById('spinner-container');
const errorContainer = document.getElementById('error-container');
const welcomeContainer = document.getElementById('welcome-container');
const lessonPlanContainer = document.getElementById('lesson-plan-container');
const errorMessageSpan = document.getElementById('error-message');

// Constants
const GRADE_LEVELS = [
  'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
  '6th Grade', '7th Grade', '8th Grade', '9th Grade (Freshman)', '10th Grade (Sophomore)',
  '11th Grade (Junior)', '12th Grade (Senior)', 'University/College Level',
];

const ICONS = {
    OBJECTIVES: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block mr-2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    MATERIALS: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block mr-2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`,
    ACTIVITIES: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block mr-2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    ASSESSMENT: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 inline-block mr-2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
}

const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A creative and engaging title for the lesson plan." },
    subject: { type: Type.STRING, description: "The subject of the lesson (e.g., 'Mathematics', 'History', 'Science')." },
    gradeLevel: { type: Type.STRING, description: "The target grade level for this lesson (e.g., '5th Grade')." },
    duration: { type: Type.STRING, description: "The estimated total time for the lesson (e.g., '45 minutes')." },
    objectives: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 3-4 clear, measurable learning objectives. What will students be able to do after this lesson?"
    },
    materials: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of all materials, tools, or resources needed for the lesson."
    },
    activities: {
      type: Type.ARRAY,
      description: "A step-by-step sequence of activities for the lesson, from introduction to conclusion.",
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.STRING, description: "The name of the activity step (e.g., 'Introduction', 'Group Work', 'Conclusion')." },
          description: { type: Type.STRING, description: "A detailed description of the activity and instructions for the teacher and students." },
          time: { type: Type.STRING, description: "Estimated time for this specific activity (e.g., '10 minutes')." },
        },
        required: ["step", "description", "time"],
      },
    },
    assessment: {
      type: Type.STRING,
      description: "How student learning will be assessed. Describe the method (e.g., 'Exit Ticket', 'Quiz', 'Group Presentation')."
    },
  },
  required: ["title", "subject", "gradeLevel", "duration", "objectives", "materials", "activities", "assessment"],
};


// --- AI Service ---
let ai;
try {
  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    throw new Error("API key not found. Please add your API key to the API_KEY constant at the top of index.js.");
  }
  ai = new GoogleGenAI({ apiKey: API_KEY });
} catch (error) {
  showError("Failed to initialize AI service. Please ensure your API key is correctly set at the top of index.js.");
  console.error("AI Initialization Error:", error);
  form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
}


async function generateLessonPlan(topic, gradeLevel, duration) {
  const prompt = `Generate a detailed lesson plan on the topic of "${topic}" for ${gradeLevel} students. The lesson should be designed to last approximately ${duration}. Please follow the provided JSON schema to structure your response. Be creative and ensure the activities are engaging and appropriate for the specified grade level.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: lessonPlanSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();
    const lessonPlanData = JSON.parse(jsonText);

    if (!lessonPlanData.title || !Array.isArray(lessonPlanData.activities)) {
      throw new Error("Received malformed data from API.");
    }
    
    return lessonPlanData;
  } catch (error) {
    console.error("Error generating lesson plan with Gemini:", error);
    if (error instanceof Error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while communicating with the Gemini API.");
  }
}

// --- UI Rendering ---

function setDisplayState(state) {
    spinnerContainer.classList.toggle('hidden', state !== 'loading');
    errorContainer.classList.toggle('hidden', state !== 'error');
    welcomeContainer.classList.toggle('hidden', state !== 'welcome');
    lessonPlanContainer.classList.toggle('hidden', state !== 'plan');
}

function showError(message) {
    errorMessageSpan.textContent = message;
    setDisplayState('error');
}

function renderSectionCard(title, icon, content) {
    return `
    <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
        <h3 class="font-bold text-lg mb-2 text-black dark:text-white flex items-center">
            ${icon}
            ${title}
        </h3>
        <div class="prose prose-slate dark:prose-invert max-w-none prose-sm">
            ${content}
        </div>
    </div>`;
}

function renderLessonPlan(plan) {
    const objectivesList = `<ul class="list-disc pl-5 space-y-1">${plan.objectives.map(obj => `<li>${obj}</li>`).join('')}</ul>`;
    const materialsList = `<ul class="list-disc pl-5 space-y-1">${plan.materials.map(mat => `<li>${mat}</li>`).join('')}</ul>`;
    
    const activities = `
        <div>
            <h3 class="font-bold text-lg mb-2 text-black dark:text-white flex items-center">
                ${ICONS.ACTIVITIES}
                Lesson Activities
            </h3>
            <div class="space-y-4">
                ${plan.activities.map((activity, i) => `
                    <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <div class="flex justify-between items-center mb-1">
                            <h4 class="font-semibold text-md text-black dark:text-white">${i + 1}. ${activity.step}</h4>
                            <span class="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">${activity.time}</span>
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-300">${activity.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>`;

    const assessment = `<p>${plan.assessment}</p>`;

    const html = `
      <div class="animate-fade-in">
        <header class="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
          <h2 class="text-3xl font-extrabold text-black dark:text-white tracking-tight">${plan.title}</h2>
          <div class="flex items-center flex-wrap gap-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span><strong>Subject:</strong> ${plan.subject}</span>
              <span><strong>Grade:</strong> ${plan.gradeLevel}</span>
              <span><strong>Duration:</strong> ${plan.duration}</span>
          </div>
        </header>
        <div class="space-y-6">
            ${renderSectionCard('Learning Objectives', ICONS.OBJECTIVES, objectivesList)}
            ${renderSectionCard('Materials & Resources', ICONS.MATERIALS, materialsList)}
            ${activities}
            ${renderSectionCard('Assessment', ICONS.ASSESSMENT, assessment)}
        </div>
      </div>
    `;
    lessonPlanContainer.innerHTML = html;
    setDisplayState('plan');
}

// --- Initialization & Event Listeners ---

function populateGradeLevels() {
    GRADE_LEVELS.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level;
        gradeLevelSelect.appendChild(option);
    });
    gradeLevelSelect.value = '4th Grade'; // Set default
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ai) {
        showError("AI service is not initialized. Please check your API key at the top of index.js.");
        return;
    }

    const formData = new FormData(form);
    const topic = formData.get('topic').trim();
    const gradeLevel = formData.get('gradeLevel');
    const duration = formData.get('duration').trim();

    if (!topic || !gradeLevel || !duration) {
        showError("All fields are required.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Generating...';
    setDisplayState('loading');

    try {
        const plan = await generateLessonPlan(topic, gradeLevel, duration);
        renderLessonPlan(plan);
    } catch (err) {
        if (err instanceof Error) {
            showError(`Failed to generate lesson plan: ${err.message}. Please check your connection and try again.`);
        } else {
            showError("An unknown error occurred.");
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Generate Plan';
    }
});

// Initial App State
populateGradeLevels();
if (ai) {
    setDisplayState('welcome');
}
