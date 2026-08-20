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

  it('monospace 只在显式开启时增加等宽语义样式', () => {
    render(
      <>
        <SemanticTag label="普通编号" tone="neutral" />
        <SemanticTag label="等宽编号" monospace tone="neutral" />
      </>,
    );

    expect(screen.getByText('等宽编号').className).not.toBe(
      screen.getByText('普通编号').className,
    );
  });
});
