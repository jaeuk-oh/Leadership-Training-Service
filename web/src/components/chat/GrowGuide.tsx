import type { GrowStage } from '@/types'
import { GROW_STAGE_LABELS } from '@/types'

const GROW_QUESTIONS: Record<GrowStage, { category: string; questions: string[] }[]> = {
  goal: [
    {
      category: '목표 탐색',
      questions: [
        '오늘 이 대화에서 어떤 것을 얻어가고 싶으신가요?',
        '이 상황이 어떻게 달라지길 바라세요?',
        '6개월 후 어떤 모습이 되어 있길 원하시나요?',
      ],
    },
    {
      category: '목표 구체화',
      questions: [
        '그 목표가 달성되면 어떻게 알 수 있을까요?',
        '언제까지, 얼마나 달성하고 싶으세요?',
        '그 목표를 이루는 게 왜 중요한가요?',
      ],
    },
  ],
  reality: [
    {
      category: '현황 파악',
      questions: [
        '지금 현재 상황은 어떤가요?',
        '지금까지 어떤 노력을 해보셨나요?',
        '0에서 10 사이로 보면, 지금 몇 점 정도 되나요?',
      ],
    },
    {
      category: '영향 탐색',
      questions: [
        '이 상황이 본인에게 어떤 영향을 미치고 있나요?',
        '이 상황의 원인이 무엇이라고 생각하세요?',
        '주변 사람들은 이 상황을 어떻게 보고 있나요?',
      ],
    },
  ],
  options: [
    {
      category: '가능성 탐색',
      questions: [
        '지금 할 수 있는 방법들이 어떤 게 있을까요?',
        '만약 제약이 없다면 무엇을 해보고 싶으세요?',
        '존경하는 사람이라면 이 상황에서 어떻게 했을까요?',
      ],
    },
    {
      category: '옵션 평가',
      questions: [
        '그 방법들 중에서 가장 끌리는 것은 무엇인가요?',
        '각 방법의 장단점이 어떻게 될까요?',
        '어떤 방법이 가장 실행 가능할 것 같으세요?',
      ],
    },
  ],
  will: [
    {
      category: '실행 계획',
      questions: [
        '그럼 첫 번째로 무엇을 해보시겠어요?',
        '언제, 어디서, 어떻게 시작하실 건가요?',
        '이 계획의 실행 가능성을 1-10으로 보면 몇 점인가요?',
      ],
    },
    {
      category: '지원과 책임',
      questions: [
        '이 계획을 실행하는 데 어떤 지원이 필요하세요?',
        '무엇이 계획 실행을 방해할 수 있을까요?',
        '다음에 만날 때까지 어떤 것을 해오실 수 있나요?',
      ],
    },
  ],
}

interface GrowGuideProps {
  currentStage: GrowStage
}

export default function GrowGuide({ currentStage }: GrowGuideProps) {
  const stages: GrowStage[] = ['goal', 'reality', 'options', 'will']

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-2">
        {stages.map((stage) => (
          <div
            key={stage}
            className={`p-3 rounded-lg text-center text-sm font-medium border ${
              stage === currentStage
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-transparent'
            }`}
          >
            {GROW_STAGE_LABELS[stage]}
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {GROW_QUESTIONS[currentStage].map(({ category, questions }) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h4>
            <ul className="space-y-2">
              {questions.map((q) => (
                <li key={q} className="text-sm bg-muted/50 rounded-lg px-4 py-2.5">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">코칭 팁</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          {currentStage === 'goal' && '목표는 코치가 정해주지 말고, 질문을 통해 피코치자 스스로 찾게 하세요.'}
          {currentStage === 'reality' && '현실 파악에서는 판단이나 조언 없이 사실과 감정을 탐색하세요.'}
          {currentStage === 'options' && '아이디어를 평가하지 말고 브레인스토밍하듯 모든 가능성을 탐색하세요.'}
          {currentStage === 'will' && '구체적이고 측정 가능한 첫 번째 행동에 집중하세요.'}
        </p>
      </div>
    </div>
  )
}
