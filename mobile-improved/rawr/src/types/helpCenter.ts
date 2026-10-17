export type ArticleBlock =
{type: 'p';text: string;} |
{type: 'steps';items: string[];} |
{type: 'bullets';items: string[];} |
{type: 'warning';text: string;} |
{type: 'tip';text: string;} |
{type: 'link';label: string;to: string;};

export interface GuideSection {
  heading: string;
  items: string[];
}

export interface StartGuide {
  id: string;
  /** "guide" renders numbered sections with bullets; "checklist" renders tickable boxes */
  kind: 'guide' | 'checklist';
  title: string;
  summary: string;
  sections: GuideSection[];
}