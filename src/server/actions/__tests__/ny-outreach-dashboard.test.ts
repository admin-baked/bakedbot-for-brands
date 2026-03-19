describe('ny outreach dashboard read actions', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('loads dashboard data without eagerly importing the email dispatcher', async () => {
    const requireUser = jest.fn().mockResolvedValue({
      uid: 'super-1',
      email: 'martez@bakedbot.ai',
      role: 'super_user',
    });

    const makeCountSnapshot = (count: number) => ({
      data: () => ({ count }),
    });

    const makeCountQuery = (count: number) => ({
      get: jest.fn().mockResolvedValue(makeCountSnapshot(count)),
    });

    const queueCollection = {
      where: jest.fn(),
      count: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
    };
    queueCollection.where.mockReturnValue(queueCollection);
    queueCollection.count.mockReturnValue(makeCountQuery(0));
    queueCollection.orderBy.mockReturnValue(queueCollection);
    queueCollection.limit.mockReturnValue(queueCollection);
    queueCollection.get.mockResolvedValue({ docs: [] });

    const draftsCollection = {
      where: jest.fn(),
      count: jest.fn(),
      get: jest.fn(),
    };
    draftsCollection.where.mockReturnValue(draftsCollection);
    draftsCollection.count.mockReturnValue(makeCountQuery(0));
    draftsCollection.get.mockResolvedValue({ docs: [] });

    const crmCollection = {
      orderBy: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
    };
    crmCollection.orderBy.mockReturnValue(crmCollection);
    crmCollection.limit.mockReturnValue(crmCollection);
    crmCollection.get.mockResolvedValue({ docs: [] });

    const logCollection = {
      where: jest.fn(),
      count: jest.fn(),
      get: jest.fn(),
    };
    logCollection.where.mockReturnValue(logCollection);
    logCollection.count.mockReturnValue(makeCountQuery(0));
    logCollection.get.mockResolvedValue({ docs: [] });

    const firestore = {
      collection: jest.fn((name: string) => {
        switch (name) {
          case 'ny_dispensary_leads':
            return queueCollection;
          case 'ny_outreach_drafts':
            return draftsCollection;
          case 'crm_outreach_contacts':
            return crmCollection;
          case 'ny_outreach_log':
            return logCollection;
          default:
            throw new Error(`Unexpected collection: ${name}`);
        }
      }),
    };

    jest.doMock('@/server/auth/auth', () => ({
      requireUser,
    }));

    jest.doMock('@/firebase/admin', () => ({
      getAdminFirestore: jest.fn(() => firestore),
    }));

    jest.doMock('@/lib/logger', () => ({
      logger: {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      },
    }));

    jest.doMock('@/server/services/ny-outreach/outreach-read-model', () => ({
      getOutreachStats: jest.fn().mockResolvedValue({
        totalSent: 0,
        totalFailed: 0,
        totalBadEmails: 0,
        totalPending: 0,
        recentResults: [],
      }),
    }));

    jest.doMock('@/lib/email/dispatcher', () => {
      throw new Error('dispatcher imported eagerly');
    });

    const { getOutreachDashboardData } = await import('../ny-outreach-dashboard');
    const result = await getOutreachDashboardData();

    expect(result).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        queueDepth: 0,
        queueLeads: [],
        crmContacts: [],
        sentToday: 0,
        pendingDrafts: 0,
      }),
    }));
  });

  it('keeps dashboard data loading even if fallback logging fails', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const requireUser = jest.fn().mockResolvedValue({
        uid: 'super-1',
        email: 'martez@bakedbot.ai',
        role: 'super_user',
      });

      const makeCountSnapshot = (count: number) => ({
        data: () => ({ count }),
      });

      const queueCollection = {
        where: jest.fn(),
        count: jest.fn(),
        orderBy: jest.fn(),
        get: jest.fn(),
      };
      const orderedQueueQuery = {
        limit: jest.fn(),
        get: jest.fn(),
      };
      queueCollection.where.mockReturnValue(queueCollection);
      queueCollection.count.mockReturnValue({
        get: jest.fn().mockRejectedValue({
          code: 9,
          message: 'FAILED_PRECONDITION: The query requires an index.',
        }),
      });
      queueCollection.get.mockResolvedValue({ docs: [], size: 0 });
      orderedQueueQuery.limit.mockReturnValue(orderedQueueQuery);
      orderedQueueQuery.get.mockRejectedValue({
        code: 9,
        message: 'FAILED_PRECONDITION: The query requires an index.',
      });
      queueCollection.orderBy.mockReturnValue(orderedQueueQuery);

      const draftsCollection = {
        where: jest.fn(),
        count: jest.fn(),
        get: jest.fn(),
      };
      draftsCollection.where.mockReturnValue(draftsCollection);
      draftsCollection.count.mockReturnValue({
        get: jest.fn().mockResolvedValue(makeCountSnapshot(0)),
      });
      draftsCollection.get.mockResolvedValue({ docs: [], size: 0 });

      const crmCollection = {
        orderBy: jest.fn(),
        limit: jest.fn(),
        get: jest.fn(),
      };
      crmCollection.orderBy.mockReturnValue(crmCollection);
      crmCollection.limit.mockReturnValue(crmCollection);
      crmCollection.get.mockResolvedValue({ docs: [] });

      const logCollection = {
        where: jest.fn(),
        count: jest.fn(),
        get: jest.fn(),
      };
      logCollection.where.mockReturnValue(logCollection);
      logCollection.count.mockReturnValue({
        get: jest.fn().mockResolvedValue(makeCountSnapshot(0)),
      });
      logCollection.get.mockResolvedValue({ docs: [] });

      const firestore = {
        collection: jest.fn((name: string) => {
          switch (name) {
            case 'ny_dispensary_leads':
              return queueCollection;
            case 'ny_outreach_drafts':
              return draftsCollection;
            case 'crm_outreach_contacts':
              return crmCollection;
            case 'ny_outreach_log':
              return logCollection;
            default:
              throw new Error(`Unexpected collection: ${name}`);
          }
        }),
      };

      const warn = jest.fn().mockRejectedValue(new Error('logger unavailable'));

      jest.doMock('@/server/auth/auth', () => ({
        requireUser,
      }));

      jest.doMock('@/firebase/admin', () => ({
        getAdminFirestore: jest.fn(() => firestore),
      }));

      jest.doMock('@/lib/logger', () => ({
        logger: {
          warn,
          error: jest.fn(),
          info: jest.fn(),
          debug: jest.fn(),
        },
      }));

      jest.doMock('@/server/services/ny-outreach/outreach-read-model', () => ({
        getOutreachStats: jest.fn().mockResolvedValue({
          totalSent: 0,
          totalFailed: 0,
          totalBadEmails: 0,
          totalPending: 0,
          recentResults: [],
        }),
      }));

      const { getOutreachDashboardData } = await import('../ny-outreach-dashboard');
      const result = await getOutreachDashboardData();

      expect(warn).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          queueDepth: 0,
          queueLeads: [],
          crmContacts: [],
          sentToday: 0,
          pendingDrafts: 0,
        }),
      }));
    } finally {
      consoleWarnSpy.mockRestore();
    }
  });

  it('sanitizes malformed Firestore field values before returning dashboard data', async () => {
    const requireUser = jest.fn().mockResolvedValue({
      uid: 'super-1',
      email: 'martez@bakedbot.ai',
      role: 'super_user',
    });

    const makeCountSnapshot = (count: number) => ({
      data: () => ({ count }),
    });

    const makeCountQuery = (count: number) => ({
      get: jest.fn().mockResolvedValue(makeCountSnapshot(count)),
    });

    const queueDocData = {
      dispensaryName: { nested: 'bad' },
      email: { provider: 'bad' },
      city: 404,
      state: null,
      contactFormUrl: { href: 'bad' },
      source: ['crm'],
      createdAt: { toDate: () => new Date('2026-03-12T18:00:00Z') },
    };

    const crmDocData = {
      dispensaryName: ['bad'],
      email: { address: 'bad' },
      contactName: 123,
      city: false,
      state: null,
      status: { code: 'bad' },
      outreachCount: '5',
      lastOutreachAt: { toDate: () => new Date('2026-03-10T00:00:00Z') },
      lastTemplateId: { id: 'bad' },
    };

    const queueCollection = {
      where: jest.fn(),
      count: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
    };
    queueCollection.where.mockReturnValue(queueCollection);
    queueCollection.count.mockReturnValue(makeCountQuery(1));
    queueCollection.orderBy.mockReturnValue(queueCollection);
    queueCollection.limit.mockReturnValue(queueCollection);
    queueCollection.get.mockResolvedValue({
      docs: [{ id: 'lead-1', data: () => queueDocData }],
    });

    const draftsCollection = {
      where: jest.fn(),
      count: jest.fn(),
      get: jest.fn(),
    };
    draftsCollection.where.mockReturnValue(draftsCollection);
    draftsCollection.count.mockReturnValue(makeCountQuery(0));
    draftsCollection.get.mockResolvedValue({ docs: [] });

    const crmCollection = {
      orderBy: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
    };
    crmCollection.orderBy.mockReturnValue(crmCollection);
    crmCollection.limit.mockReturnValue(crmCollection);
    crmCollection.get.mockResolvedValue({
      docs: [{ id: 'crm-1', data: () => crmDocData }],
    });

    const logCollection = {
      where: jest.fn(),
      count: jest.fn(),
      get: jest.fn(),
    };
    logCollection.where.mockReturnValue(logCollection);
    logCollection.count.mockReturnValue(makeCountQuery(0));
    logCollection.get.mockResolvedValue({ docs: [] });

    const firestore = {
      collection: jest.fn((name: string) => {
        switch (name) {
          case 'ny_dispensary_leads':
            return queueCollection;
          case 'ny_outreach_drafts':
            return draftsCollection;
          case 'crm_outreach_contacts':
            return crmCollection;
          case 'ny_outreach_log':
            return logCollection;
          default:
            throw new Error(`Unexpected collection: ${name}`);
        }
      }),
    };

    jest.doMock('@/server/auth/auth', () => ({
      requireUser,
    }));

    jest.doMock('@/firebase/admin', () => ({
      getAdminFirestore: jest.fn(() => firestore),
    }));

    jest.doMock('@/lib/logger', () => ({
      logger: {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      },
    }));

    jest.doMock('@/server/services/ny-outreach/outreach-read-model', () => ({
      getOutreachStats: jest.fn().mockResolvedValue({
        totalSent: 0,
        totalFailed: 0,
        totalBadEmails: 0,
        totalPending: 0,
        recentResults: [],
      }),
    }));

    const { getOutreachDashboardData } = await import('../ny-outreach-dashboard');
    const result = await getOutreachDashboardData();

    expect(result).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        queueLeads: [
          expect.objectContaining({
            id: 'lead-1',
            dispensaryName: 'Unknown',
            email: undefined,
            city: 'Unknown City',
            state: 'NY',
            contactFormUrl: undefined,
            source: 'research',
            createdAt: new Date('2026-03-12T18:00:00Z').getTime(),
          }),
        ],
        crmContacts: [
          expect.objectContaining({
            id: 'crm-1',
            dispensaryName: 'Unknown',
            email: '',
            contactName: undefined,
            city: 'Unknown City',
            state: 'NY',
            status: 'unknown',
            outreachCount: 0,
            lastOutreachAt: new Date('2026-03-10T00:00:00Z').getTime(),
            lastTemplateId: '',
          }),
        ],
      }),
    }));
  });
});
