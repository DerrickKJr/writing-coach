// A finished sample essay for testing and demos. Open the app with ?test to load it,
// and add &step=<id> (setup, thesis, points, body-0, body-1, body-2, intro, conclusion, review) to jump in.

import type { Draft } from './essay'

const THESIS =
  'Phones should be banned during class because they pull students’ focus away from lessons, lower their grades, and get in the way of real conversations with classmates.'

export const DEMO_DRAFT: Draft = {
  assignment:
    'Should schools ban phones during class? Take a position and support it with evidence from at least two sources.',
  essayType: 'Argumentative',
  grade: 'High school',
  thesis: THESIS,
  points: ['Phones pull focus away from lessons', 'Phones hurt grades', 'Phones get in the way of real conversations'],
  notes: [
    'Lincoln High article: teachers reported fewer interruptions after phones went in lockers.',
    'Teacher survey PDF: 7 of 10 teachers said students handed in more homework after the phone policy. Class notes photo: quiz average went from 71% to 84%.',
    'Lincoln High article: students said group projects were easier without notifications.',
  ],
  sections: {
    intro: `Almost every student in my school checks their phone the second the teacher turns around. Schools across the country are now deciding whether phones belong in the classroom at all, and some, like Lincoln High School, have already started keeping them in lockers. ${THESIS}`,
    'body-0':
      'Phones pull students’ attention away from what the teacher is saying. When a notification goes off, it is almost impossible not to look, and once you look you miss part of the lesson. After Lincoln High School made students keep their phones in lockers, teachers reported fewer interruptions during lessons. Fewer interruptions means more time actually learning, which is the whole point of being in class.',
    'body-1':
      'Phones also hurt students’ grades. In a teacher survey, 7 out of 10 teachers said students handed in more homework after their school’s phone policy started. In my own class, our quiz average went from 71% to 84% the week Ms. Rivera collected phones. When students are not distracted, they understand the material and it shows in their work.',
    'body-2':
      'Finally, phones get in the way of real conversations with classmates. During group work, people who are scrolling are not really part of the group. Students at Lincoln High said group projects were easier without notifications. Learning to talk and work with other people is a skill we need, and phones make it harder to practice.',
    conclusion:
      'Taking phones out of the classroom helps students focus, get better grades, and actually connect with each other. The evidence from Lincoln High and from teachers shows that the change works. If schools want students to learn as much as they can, phones should stay in lockers until the bell rings.',
  },
  chunkProgress: { intro: 1, 'body-0': 1, 'body-1': 1, 'body-2': 1, conclusion: 1 },
  sources: [
    {
      name: 'phone-ban-article.txt',
      text: 'Phone bans in schools: what one district found. After Lincoln High School began requiring students to keep phones in lockers during class in 2024, teachers reported fewer interruptions during lessons. The school’s attendance office also noted fewer reports of students leaving class to use their phones in the hallway. Some parents worried they would not be able to reach their children in an emergency, so the school kept a phone line in the front office open during the day. Students had mixed reactions. Some said it was easier to focus on group projects without notifications, while others said they used their phones to look up vocabulary words and calculators during math.',
    },
    {
      name: 'teacher-survey.pdf',
      text: 'Survey: 7 of 10 teachers said students handed in more homework after the phone policy.',
    },
    {
      name: 'class-notes-photo.jpg',
      text: 'Class notes - Oct 28. Ms. Rivera: phones were collected in 3rd period. Quiz average went from 71% to 84% that week. Fewer kids asked to repeat directions.',
    },
  ],
}

const STEP_IDS = ['setup', 'thesis', 'points', 'body-0', 'body-1', 'body-2', 'intro', 'conclusion', 'review']

// Returns the sample draft and starting step if the URL asks for it (?test), otherwise null.
export function demoFromUrl(): { draft: Draft; step: number } | null {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('test')) return null
  const step = Math.max(0, STEP_IDS.indexOf(params.get('step') ?? 'body-0'))
  // Drop the query so a refresh keeps the student's edits instead of reloading the sample.
  window.history.replaceState(null, '', window.location.pathname)
  return { draft: structuredClone(DEMO_DRAFT), step }
}
