export interface Caption {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
  style?: string;
}

export interface CaptionStyle {
  fontSize?: string;
  color?: string;
  position?: 'top' | 'middle' | 'bottom';
  alignment?: 'left' | 'center' | 'right';
} 