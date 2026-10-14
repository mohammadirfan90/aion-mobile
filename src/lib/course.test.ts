import { describe, expect, it } from '@jest/globals';

import type { Course } from '@/api/types';

import { enrollAction, formatCoursePrice, isFreeCourse, levelLabel } from './course';

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
        accessConfig: { accessMode: 'open', pricingType: 'paid', price: 25 },
      }),
    ).toBe(false);
  });

  it('treats accessConfig paid with no price as free', () => {
    expect(
      isFreeCourse({ pricingConfig: null, accessConfig: { accessMode: 'open', pricingType: 'paid' } }),
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
        accessConfig: { accessMode: 'open', pricingType: 'paid', price: 15 },
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

describe('enrollAction (S10 bottom bar)', () => {
  const paid: Pricing = { pricingConfig: { type: 'one_time', currency: 'USD', price: 49 }, accessConfig: null };
  const access = (accessMode: 'open' | 'invite' | 'closed'): Pricing => ({ ...free, accessConfig: { accessMode } });

  it('continues when enrolled, even if the course is now closed or paid', () => {
    expect(enrollAction(access('closed'), true)).toBe('continue');
    expect(enrollAction(paid, true)).toBe('continue');
  });

  it('sends paid courses to the web', () => {
    expect(enrollAction(paid, false)).toBe('web');
  });

  it('checks closed and invite before the free path', () => {
    expect(enrollAction(access('closed'), false)).toBe('closed');
    expect(enrollAction(access('invite'), false)).toBe('invite');
    expect(enrollAction(access('open'), false)).toBe('free');
    expect(enrollAction(free, false)).toBe('free');
  });
});
