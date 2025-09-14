'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './button';

export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

interface FontSizeSelectorProps {
  className?: string;
  showLabel?: boolean;
}

export default function FontSizeSelector({
  className = '',
  showLabel = false,
}: FontSizeSelectorProps) {
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  // 初期値をlocalStorageから読み込み
  useEffect(() => {
    const savedFontSize = localStorage.getItem('richman-font-size') as FontSize;
    if (savedFontSize && ['small', 'medium', 'large', 'extra-large'].includes(savedFontSize)) {
      setFontSize(savedFontSize);
      applyFontSize(savedFontSize);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640; // sm breakpoint
      if (isMobile && fontSize !== 'medium') {
        setFontSize('medium');
        applyFontSize('medium');
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [fontSize]);

  // 文字サイズをHTMLルート要素に適用
  const applyFontSize = (size: FontSize) => {
    const root = document.documentElement;

    // 既存のフォントサイズクラスを削除
    root.classList.remove(
      'font-size-small',
      'font-size-medium',
      'font-size-large',
      'font-size-extra-large'
    );

    // 新しいフォントサイズクラスを追加
    root.classList.add(`font-size-${size}`);

    // localStorageに保存
    localStorage.setItem('richman-font-size', size);
  };

  const handleFontSizeChange = (newSize: FontSize) => {
    setFontSize(newSize);
    applyFontSize(newSize);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && <span className="mr-1 text-sm text-gray-600">文字サイズ</span>}

      <div className="flex items-center gap-1 rounded-lg bg-gray-50 p-1">
        <Button
          variant={fontSize === 'small' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleFontSizeChange('small')}
          className={`h-9 px-3 text-sm font-medium ${fontSize === 'small' ? 'bg-primary text-white' : ''}`}
          aria-label="文字サイズ小"
          title="文字サイズを小に設定"
        >
          小
        </Button>

        <Button
          variant={fontSize === 'medium' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleFontSizeChange('medium')}
          className={`h-9 px-3 text-sm font-medium ${fontSize === 'medium' ? 'bg-primary text-white' : ''}`}
          aria-label="文字サイズ中"
          title="文字サイズを中に設定"
        >
          中
        </Button>

        <Button
          variant={fontSize === 'large' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleFontSizeChange('large')}
          className={`h-9 px-3 text-sm font-medium ${fontSize === 'large' ? 'bg-primary text-white' : ''}`}
          aria-label="文字サイズ大"
          title="文字サイズを大に設定"
        >
          大
        </Button>

        <Button
          variant={fontSize === 'extra-large' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleFontSizeChange('extra-large')}
          className={`h-9 whitespace-nowrap px-3 text-sm font-medium ${fontSize === 'extra-large' ? 'bg-primary text-white' : ''}`}
          aria-label="文字サイズ特大"
          title="文字サイズを特大に設定"
        >
          特大
        </Button>
      </div>
    </div>
  );
}

// 文字サイズ設定を取得するヘルパー関数
export const getCurrentFontSize = (): FontSize => {
  const savedFontSize = localStorage.getItem('richman-font-size') as FontSize;
  return savedFontSize && ['small', 'medium', 'large', 'extra-large'].includes(savedFontSize)
    ? savedFontSize
    : 'medium';
};

// 文字サイズ設定をリセットするヘルパー関数
export const resetFontSize = () => {
  localStorage.removeItem('richman-font-size');
  const root = document.documentElement;
  root.classList.remove(
    'font-size-small',
    'font-size-medium',
    'font-size-large',
    'font-size-extra-large'
  );
  root.classList.add('font-size-medium');
};
