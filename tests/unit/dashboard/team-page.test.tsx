import React from 'react';
import { render } from '@testing-library/react';

import TeamPage from '@/app/dashboard/team/page';
import { redirect } from 'next/navigation';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('TeamPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to the settings team page', () => {
    render(<TeamPage />);

    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard/settings/team');
  });
});
