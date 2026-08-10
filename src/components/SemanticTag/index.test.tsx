import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SemanticTag } from '.';

describe('SemanticTag', () => {
  it('以文字和不同样式同时表达语义状态', () => {
    render(
      <>
        <SemanticTag label="运行中" tone="success" />
        <SemanticTag label="需关注" tone="danger" />
      </>,
    );

    const runningTag = screen.getByText('运行中');
    const attentionTag = screen.getByText('需关注');

    expect(runningTag).toBeInTheDocument();
    expect(attentionTag).toBeInTheDocument();
    expect(runningTag.className).not.toBe(attentionTag.className);
  });
});
