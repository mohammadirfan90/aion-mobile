import { describe, expect, it } from '@jest/globals';

import type { Course } from '@/api/types';

import { formatCoursePrice, isFreeCourse, levelLabel } from './course';

type Pricing = Pick<Course, 'pricingConfig' | 'accessConfig'>;

const free: Pricing = { pricingConfig: { type: 'free', currency: 'USD', price: 0 }, accessConfig: null };

describe('isFreeCourse (API §3 effective price)', () => {
  it('is free with no pricing at all', () => {
    expect(isFreeCourse({ pricingConfig: null, accessConfig: null })).toBe(true);
  });

  it('is free when pricingConfig says free', () => {
    expect(isFreeCourse(free)).toBe(true);
  });

  it('is paid when pricingConfig is not free and has a price', () => {
    expect(
      isFreeCourse({ pricingConfig: { type: 'one_time', currency: 'USD', price: 49 }, accessConfig: null }),
    ).toBe(false);
  });

  it('ignores a non-free pricingConfig with a zero price', () => {
    expect(
      isFreeCourse({ pricingConfig: { type: 'one_time', currency: 'USD', price: 0 }, accessConfig: null }),
    ).toBe(true);
  });

  it('falls back to accessConfig paid pricing', () => {
    expect(
      isFreeCourse({
        pricingConfig: null,
        accessConfig: { mode: 'paid', pricingType: 'paid', price: 25 },
      }),
    ).toBe(false);
  });

  it('treats accessConfig paid with no price as free', () => {
    expect(
      isFreeCourse({ pricingConfig: null, accessConfig: { mode: 'paid', pricingType: 'paid' } }),
    ).toBe(true);
  });
});

describe('formatCoursePrice', () => {
  it('shows Free for free courses', () => {
    expect(formatCoursePrice(free)).toBe('Free');
  });

  it('shows whole units, not cents', () => {
    expect(
      formatCoursePrice({
        pricingConfig: { type: 'one_time', currency: 'USD', price: 49 },
        accessConfig: null,
      }),
    ).toBe('$49');
  });

  it('shows other currencies by code', () => {
    expect(
      formatCoursePrice({
        pricingConfig: { type: 'one_time', currency: 'eur', price: 30 },
        accessConfig: null,
      }),
    ).toBe('30 EUR');
  });

  it('uses the accessConfig price in USD', () => {
    expect(
      formatCoursePrice({
        pricingConfig: { type: 'free', currency: 'USD', price: 0 },
        accessConfig: { mode: 'paid', pricingType: 'paid', price: 15 },
      }),
    ).toBe('$15');
  });
});

describe('levelLabel', () => {
  it('capitalizes a level', () => {
    expect(levelLabel('beginner')).toBe('Beginner');
  });

  it('shows All for no level', () => {
    expect(levelLabel(null)).toBe('All');
  });
});
