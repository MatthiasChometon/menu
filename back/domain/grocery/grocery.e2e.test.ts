import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';
import type { MailMessage } from '../../infrastructure/mail/token';
import { UserRepository } from '../user/repository';
import { GroceryCatalogRepository } from './catalog/repository';
import { GroceryPantryRepository } from './pantry/repository';
import { GroceryPushRepository } from './push/repository';

const PAIR_DEVICE = `
  mutation ($label: String!) {
    pairGroceryDevice(label: $label) { token device { id label } }
  }
`;

const MY_DEVICES = `query { myGroceryDevices { id label } }`;

const CREATE_JOB = `
  mutation ($input: CreateGroceryJobInput!) {
    createGroceryJob(input: $input) {
      id weekOf status
      lines { foodId grams fromPantry ean units }
    }
  }
`;

const CLAIM_JOB = `
  mutation {
    claimGroceryJob {
      id weekOf status
      lines { foodId units ean }
      slotWindows { weekday startMinute endMinute }
    }
  }
`;

const REPORT_EVENT = `
  mutation ($jobId: ID!, $input: GroceryJobEventInput!) {
    reportGroceryJobEvent(jobId: $jobId, input: $input) { kind foodId label detail }
  }
`;

const FINISH_JOB = `
  mutation ($jobId: ID!, $input: GroceryJobOutcomeInput!) {
    finishGroceryJob(jobId: $jobId, input: $input) {
      id status productsCents deliveryFeesCents shortOfMinimumCents overThreshold
    }
  }
`;

const SAVE_PREFERENCE = `
  mutation ($input: GroceryPreferenceInput!) {
    saveGroceryPreference(input: $input) { alertThresholdCents }
  }
`;

const MY_PREFERENCE = `query { myGroceryPreference { alertThresholdCents } }`;

const JOB = `
  query ($jobId: ID!) {
    groceryJob(jobId: $jobId) { id status events { kind foodId detail } }
  }
`;

type Line = {
  foodId: string;
  grams: number;
  fromPantry: number;
  ean?: string;
  units?: number;
};
type Job = { id: string; weekOf: string; status: string; lines: Line[] };
type Device = { token: string; device: { id: string; label: string } };

let api: TestApp;

const signIn = async (email: string): Promise<string> =>
  api.signUp(email, 'a-long-enough-password');

const pair = async (cookie: string, label: string): Promise<string> => {
  const response = await api.graphql<{ pairGroceryDevice: Device }>(PAIR_DEVICE, { label }, cookie);

  return response.data!.pairGroceryDevice.token;
};

const asDevice = (token: string): Record<string, string> => ({
  'x-grocery-device-token': token,
});

const queueJob = async (
  cookie: string,
  needs: { foodId: string; grams: number }[] = [{ foodId: 'brownRice', grams: 960 }],
  weekOf = '2026-08-24',
): Promise<Job> => {
  const response = await api.graphql<{ createGroceryJob: Job }>(
    CREATE_JOB,
    { input: { weekOf, needs } },
    cookie,
  );

  return response.data!.createGroceryJob;
};

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('pairing a browser', () => {
  it('hands out a token and lists the browser afterwards', async () => {
    const cookie = await signIn('matthias@example.com');

    const paired = await api.graphql<{ pairGroceryDevice: Device }>(
      PAIR_DEVICE,
      { label: 'Desktop' },
      cookie,
    );
    const listed = await api.graphql<{ myGroceryDevices: { label: string }[] }>(
      MY_DEVICES,
      undefined,
      cookie,
    );

    expect(paired.data?.pairGroceryDevice.token).toEqual(expect.any(String));
    expect(listed.data?.myGroceryDevices).toEqual([expect.objectContaining({ label: 'Desktop' })]);
  });

  it('refuses to pair for a visitor who is not signed in', async () => {
    const response = await api.graphql(PAIR_DEVICE, { label: 'Desktop' });

    expect(response.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
  });
});

describe('running a queued order', () => {
  it('lets a paired browser pick the run up, report on it and close it', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);

    const claimed = await api.graphql<{ claimGroceryJob: Job }>(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice(token),
    );
    await api.graphql(
      REPORT_EVENT,
      {
        jobId: queued.id,
        input: { kind: 'LINE_SUBSTITUTED', foodId: 'wholeMilk', detail: 'out of stock' },
      },
      undefined,
      asDevice(token),
    );
    await api.graphql(
      FINISH_JOB,
      { jobId: queued.id, input: { outcome: 'SUCCEEDED' } },
      undefined,
      asDevice(token),
    );

    const followed = await api.graphql<{
      groceryJob: { status: string; events: { kind: string; foodId?: string }[] };
    }>(JOB, { jobId: queued.id }, cookie);

    expect(queued.status).toBe('PENDING');
    expect(claimed.data?.claimGroceryJob).toEqual(
      expect.objectContaining({ id: queued.id, status: 'RUNNING' }),
    );
    expect(followed.data?.groceryJob.status).toBe('SUCCEEDED');
    expect(followed.data?.groceryJob.events).toEqual([
      expect.objectContaining({ kind: 'LINE_SUBSTITUTED', foodId: 'wholeMilk' }),
    ]);
  });

  it('has nothing to hand out when no run is waiting', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');

    const claimed = await api.graphql<{ claimGroceryJob: Job | null }>(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice(token),
    );

    expect(claimed.data?.claimGroceryJob).toBeNull();
  });

  it('gives the same run to only one browser', async () => {
    const cookie = await signIn('matthias@example.com');
    const [first, second] = [await pair(cookie, 'Desktop'), await pair(cookie, 'Laptop')];
    await queueJob(cookie);

    const claims = await Promise.all([
      api.graphql<{ claimGroceryJob: Job | null }>(
        CLAIM_JOB,
        undefined,
        undefined,
        asDevice(first),
      ),
      api.graphql<{ claimGroceryJob: Job | null }>(
        CLAIM_JOB,
        undefined,
        undefined,
        asDevice(second),
      ),
    ]);

    const handedOut = claims.filter((claim): boolean => claim.data?.claimGroceryJob != null);
    expect(handedOut).toHaveLength(1);
  });
});

describe('keeping accounts apart', () => {
  it('never hands one account a run queued by another', async () => {
    const mine = await signIn('matthias@example.com');
    const theirs = await signIn('someone-else@example.com');
    const theirToken = await pair(theirs, 'Their desktop');
    await queueJob(mine);

    const claimed = await api.graphql<{ claimGroceryJob: Job | null }>(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice(theirToken),
    );

    expect(claimed.data?.claimGroceryJob).toBeNull();
  });

  it('refuses to write into a run the browser does not hold', async () => {
    const mine = await signIn('matthias@example.com');
    const theirs = await signIn('someone-else@example.com');
    const theirToken = await pair(theirs, 'Their desktop');
    const queued = await queueJob(mine);

    const reported = await api.graphql(
      REPORT_EVENT,
      { jobId: queued.id, input: { kind: 'LINE_ADDED', foodId: 'brownRice' } },
      undefined,
      asDevice(theirToken),
    );
    const followed = await api.graphql<{ groceryJob: { events: unknown[] } }>(
      JOB,
      { jobId: queued.id },
      mine,
    );

    expect(reported.errors?.[0].message).toBeDefined();
    expect(followed.data?.groceryJob.events).toEqual([]);
  });

  it('shows nothing when asked for a run belonging to someone else', async () => {
    const mine = await signIn('matthias@example.com');
    const theirs = await signIn('someone-else@example.com');
    const queued = await queueJob(mine);

    const response = await api.graphql<{ groceryJob: unknown }>(JOB, { jobId: queued.id }, theirs);

    expect(response.data?.groceryJob).toBeNull();
  });

  it('turns away a token that was never issued', async () => {
    const response = await api.graphql(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice('not-a-real-token'),
    );

    expect(response.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
  });
});

describe('working out what to buy', () => {
  const RICE = {
    foodId: 'brownRice',
    ean: '3560070510771',
    name: "Riz Complet CARREFOUR CLASSIC'",
    size: 500,
  };

  it('turns the grams of a week into whole products', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.resolve(GroceryCatalogRepository).record([RICE]);

    const queued = await queueJob(cookie, [{ foodId: 'brownRice', grams: 960 }]);

    expect(queued.lines).toEqual([
      expect.objectContaining({ foodId: 'brownRice', ean: RICE.ean, units: 2, fromPantry: 0 }),
    ]);
  });

  it('buys less when the cupboard already holds some', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.resolve(GroceryCatalogRepository).record([RICE]);

    const account = await api.resolve(UserRepository).findRecordByEmail('matthias@example.com');
    await api.resolve(GroceryPantryRepository).set(account!.id, 'brownRice', 500);

    const queued = await queueJob(cookie, [{ foodId: 'brownRice', grams: 960 }]);

    expect(queued.lines[0]).toEqual(
      expect.objectContaining({ units: 1, fromPantry: 500, grams: 960 }),
    );
  });

  it('still carries a food whose product is unknown, so the run goes looking', async () => {
    const cookie = await signIn('matthias@example.com');

    const queued = await queueJob(cookie, [{ foodId: 'tofu', grams: 400 }]);

    expect(queued.lines).toEqual([expect.objectContaining({ foodId: 'tofu', grams: 400 })]);
    expect(queued.lines[0].units).toBeNull();
  });

  it('hands the basket to the browser that takes the run', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.resolve(GroceryCatalogRepository).record([RICE]);
    const token = await pair(cookie, 'Desktop');
    await queueJob(cookie, [{ foodId: 'brownRice', grams: 960 }]);

    const claimed = await api.graphql<{ claimGroceryJob: Job }>(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice(token),
    );

    expect(claimed.data?.claimGroceryJob.lines).toEqual([
      expect.objectContaining({ foodId: 'brownRice', ean: RICE.ean, units: 2 }),
    ]);
  });
});

describe('telling the reader what the basket costs', () => {
  type Finished = {
    status: string;
    productsCents?: number;
    deliveryFeesCents?: number;
    shortOfMinimumCents?: number;
    overThreshold: boolean;
  };

  const finish = async (
    token: string,
    jobId: string,
    input: Record<string, unknown>,
  ): Promise<Finished | undefined> => {
    const response = await api.graphql<{ finishGroceryJob: Finished }>(
      FINISH_JOB,
      { jobId, input: { outcome: 'SUCCEEDED', ...input } },
      undefined,
      asDevice(token),
    );

    return response.data?.finishGroceryJob;
  };

  it('keeps the amounts the run came back with', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));

    const closed = await finish(token, queued.id, {
      productsCents: 8450,
      deliveryFeesCents: 790,
    });

    expect(closed).toEqual(
      expect.objectContaining({ productsCents: 8450, deliveryFeesCents: 790 }),
    );
  });

  it('flags a basket over what the account asked to be warned about', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.graphql(SAVE_PREFERENCE, { input: { alertThresholdCents: 5000 } }, cookie);
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));

    const closed = await finish(token, queued.id, { productsCents: 8450 });

    expect(closed?.overThreshold).toBe(true);
  });

  it('stays quiet when the basket is under it', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.graphql(SAVE_PREFERENCE, { input: { alertThresholdCents: 12000 } }, cookie);
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));

    const closed = await finish(token, queued.id, { productsCents: 8450 });

    expect(closed?.overThreshold).toBe(false);
  });

  it('measures against the threshold in force when the run was asked for', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.graphql(SAVE_PREFERENCE, { input: { alertThresholdCents: 5000 } }, cookie);
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));
    // Raised after the run was queued: it must not rewrite what the run meant.
    await api.graphql(SAVE_PREFERENCE, { input: { alertThresholdCents: 20000 } }, cookie);

    const closed = await finish(token, queued.id, { productsCents: 8450 });

    expect(closed?.overThreshold).toBe(true);
  });

  it('warns by default, before anyone opens the settings', async () => {
    const cookie = await signIn('matthias@example.com');

    const response = await api.graphql<{ myGroceryPreference: { alertThresholdCents: number } }>(
      MY_PREFERENCE,
      undefined,
      cookie,
    );

    expect(response.data?.myGroceryPreference.alertThresholdCents).toBe(12000);
  });

  it('reports a basket that cannot be ordered at all', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));

    const closed = await finish(token, queued.id, {
      productsCents: 3200,
      shortOfMinimumCents: 2800,
    });

    expect(closed?.shortOfMinimumCents).toBe(2800);
  });
});

describe('what the week leaves in the cupboard', () => {
  const RICE = {
    foodId: 'brownRice',
    ean: '3560070510771',
    name: "Riz Complet CARREFOUR CLASSIC'",
    size: 500,
  };

  const runAndClose = async (
    cookie: string,
    needs: { foodId: string; grams: number }[],
    closing: Record<string, unknown> = {},
  ): Promise<void> => {
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie, needs);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));
    await api.graphql(
      FINISH_JOB,
      { jobId: queued.id, input: { outcome: 'SUCCEEDED', ...closing } },
      undefined,
      asDevice(token),
    );
  };

  const pantryOf = async (email: string): Promise<Map<string, number>> => {
    const account = await api.resolve(UserRepository).findRecordByEmail(email);

    return api.resolve(GroceryPantryRepository).forUser(account!.id);
  };

  it('keeps what was bought over what was eaten', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.resolve(GroceryCatalogRepository).record([RICE]);

    // Two boxes of 500 g bought for 960 g eaten.
    await runAndClose(cookie, [{ foodId: 'brownRice', grams: 960 }]);

    expect((await pantryOf('matthias@example.com')).get('brownRice')).toBe(40);
  });

  it('does not stock what the shop never supplied', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.resolve(GroceryCatalogRepository).record([RICE]);

    await runAndClose(cookie, [{ foodId: 'brownRice', grams: 960 }], {
      missingFoodIds: ['brownRice'],
    });

    expect((await pantryOf('matthias@example.com')).has('brownRice')).toBe(false);
  });

  it('leaves the cupboard alone when the run did not succeed', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.resolve(GroceryCatalogRepository).record([RICE]);
    const account = await api.resolve(UserRepository).findRecordByEmail('matthias@example.com');
    await api.resolve(GroceryPantryRepository).set(account!.id, 'oats', 300);

    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie, [{ foodId: 'brownRice', grams: 960 }]);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));
    await api.graphql(
      FINISH_JOB,
      { jobId: queued.id, input: { outcome: 'BLOCKED' } },
      undefined,
      asDevice(token),
    );

    expect((await pantryOf('matthias@example.com')).get('oats')).toBe(300);
  });
});

describe('when a delivery is welcome', () => {
  const SAVE_WINDOWS = `
    mutation ($input: GrocerySlotWindowsInput!) {
      saveGrocerySlotWindows(input: $input) { weekday startMinute endMinute }
    }
  `;
  const MY_WINDOWS = `query { myGrocerySlotWindows { weekday startMinute endMinute } }`;

  const SATURDAY_MORNING = { weekday: 6, startMinute: 480, endMinute: 720 };

  it('hands the windows to the browser that takes the run', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.graphql(SAVE_WINDOWS, { input: { windows: [SATURDAY_MORNING] } }, cookie);
    const token = await pair(cookie, 'Desktop');
    await queueJob(cookie);

    const claimed = await api.graphql<{ claimGroceryJob: { slotWindows: unknown[] } }>(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice(token),
    );

    expect(claimed.data?.claimGroceryJob.slotWindows).toEqual([SATURDAY_MORNING]);
  });

  it('hands over none when the account never said, so nothing is booked', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');
    await queueJob(cookie);

    const claimed = await api.graphql<{ claimGroceryJob: { slotWindows: unknown[] } }>(
      CLAIM_JOB,
      undefined,
      undefined,
      asDevice(token),
    );

    expect(claimed.data?.claimGroceryJob.slotWindows).toEqual([]);
  });

  it('replaces the whole set rather than adding to it', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.graphql(SAVE_WINDOWS, { input: { windows: [SATURDAY_MORNING] } }, cookie);

    const saved = await api.graphql<{ saveGrocerySlotWindows: { weekday: number }[] }>(
      SAVE_WINDOWS,
      { input: { windows: [{ weekday: 3, startMinute: 1080, endMinute: 1260 }] } },
      cookie,
    );

    expect(saved.data?.saveGrocerySlotWindows).toEqual([
      { weekday: 3, startMinute: 1080, endMinute: 1260 },
    ]);
  });

  it('turns down a weekday that does not exist', async () => {
    const cookie = await signIn('matthias@example.com');

    const response = await api.graphql(
      SAVE_WINDOWS,
      { input: { windows: [{ weekday: 9, startMinute: 480, endMinute: 720 }] } },
      cookie,
    );

    expect(response.errors?.[0].message).toBeDefined();
  });

  it('keeps one account out of another one windows', async () => {
    const mine = await signIn('matthias@example.com');
    const theirs = await signIn('someone-else@example.com');
    await api.graphql(SAVE_WINDOWS, { input: { windows: [SATURDAY_MORNING] } }, mine);

    const response = await api.graphql<{ myGrocerySlotWindows: unknown[] }>(
      MY_WINDOWS,
      undefined,
      theirs,
    );

    expect(response.data?.myGrocerySlotWindows).toEqual([]);
  });
});

describe('keeping the reference in step with the shelves', () => {
  const RICE = {
    foodId: 'brownRice',
    ean: '3560070510771',
    name: "Riz Complet CARREFOUR CLASSIC'",
    size: 500,
  };

  const close = async (cookie: string, observations: unknown[]): Promise<void> => {
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));
    await api.graphql(
      FINISH_JOB,
      { jobId: queued.id, input: { outcome: 'SUCCEEDED', observations } },
      undefined,
      asDevice(token),
    );
  };

  const productOf = async (foodId: string): Promise<{ size: number; ean: string } | undefined> =>
    (await api.resolve(GroceryCatalogRepository).knownProducts()).get(foodId);

  it('takes the price the shop actually charged', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.resolve(GroceryCatalogRepository).record([{ ...RICE, priceCents: 179 }]);

    await close(cookie, [{ ...RICE, priceCents: 199, size: undefined }]);

    const products = await api.resolve(GroceryCatalogRepository).knownProducts();
    expect(products.get('brownRice')?.name).toBe(RICE.name);
  });

  it('never overwrites a known size with nothing', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.resolve(GroceryCatalogRepository).record([{ ...RICE, priceCents: 179 }]);

    await close(cookie, [{ ...RICE, priceCents: 199 }]);

    expect((await productOf('brownRice'))?.size).toBe(500);
  });

  it('promotes a substitute to the product of reference', async () => {
    const cookie = await signIn('matthias@example.com');

    await close(cookie, [
      {
        foodId: 'tofu',
        ean: '9999999999999',
        name: 'Tofu nature BJORG',
        priceCents: 249,
        size: 200,
      },
    ]);

    expect(await productOf('tofu')).toEqual(
      expect.objectContaining({ ean: '9999999999999', size: 200 }),
    );
  });

  it('leaves the reference alone when the run did not succeed', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));
    await api.graphql(
      FINISH_JOB,
      {
        jobId: queued.id,
        input: {
          outcome: 'BLOCKED',
          observations: [{ foodId: 'tofu', ean: '1', name: 'Tofu', priceCents: 100, size: 200 }],
        },
      },
      undefined,
      asDevice(token),
    );

    expect(await productOf('tofu')).toBeUndefined();
  });
});

describe('telling somebody the basket is ready', () => {
  const closeWith = async (cookie: string, input: Record<string, unknown>): Promise<void> => {
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));
    await api.graphql(
      FINISH_JOB,
      { jobId: queued.id, input: { outcome: 'SUCCEEDED', ...input } },
      undefined,
      asDevice(token),
    );
  };

  // Signing up sends its own verification mail, so the report is never the
  // first message of a test — only the last one addressed to the reader.
  const reportMail = (to: string): MailMessage =>
    [...api.mails()].reverse().find((message): boolean => message.to === to)!;

  it('writes to the account that asked, once the run is closed', async () => {
    const cookie = await signIn('matthias@example.com');

    await closeWith(cookie, { productsCents: 8450, deliveryFeesCents: 790 });

    expect(reportMail('matthias@example.com')).toEqual(
      expect.objectContaining({ to: 'matthias@example.com', subject: 'Panier prêt' }),
    );
  });

  it('says in the subject when the basket wants a look', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.graphql(
      `mutation ($input: GroceryPreferenceInput!) {
        saveGroceryPreference(input: $input) { alertThresholdCents }
      }`,
      { input: { alertThresholdCents: 5000 } },
      cookie,
    );

    await closeWith(cookie, { productsCents: 8450 });

    expect(reportMail('matthias@example.com').subject).toBe('Panier prêt, à vérifier');
  });

  it('writes even when the run was stopped, which is when it matters most', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));

    await api.graphql(
      FINISH_JOB,
      { jobId: queued.id, input: { outcome: 'BLOCKED' } },
      undefined,
      asDevice(token),
    );

    expect(reportMail('matthias@example.com').subject).toBe(
      'Courses interrompues : il faut ton intervention',
    );
  });

  it('escapes what the shop wrote, since it lands in an HTML document', async () => {
    const cookie = await signIn('matthias@example.com');
    const token = await pair(cookie, 'Desktop');
    const queued = await queueJob(cookie);
    await api.graphql(CLAIM_JOB, undefined, undefined, asDevice(token));
    await api.graphql(
      REPORT_EVENT,
      {
        jobId: queued.id,
        input: { kind: 'LINE_MISSING', label: '<script>alert(1)</script>' },
      },
      undefined,
      asDevice(token),
    );

    await api.graphql(
      FINISH_JOB,
      { jobId: queued.id, input: { outcome: 'SUCCEEDED', productsCents: 100 } },
      undefined,
      asDevice(token),
    );

    expect(reportMail('matthias@example.com').html).not.toContain('<script>');
    expect(reportMail('matthias@example.com').html).toContain('&lt;script&gt;');
  });
});

describe('agreeing to be told on a phone', () => {
  const SUBSCRIBE = `
    mutation ($input: PushSubscriptionInput!) {
      subscribeToGroceryPush(input: $input)
    }
  `;
  const UNSUBSCRIBE = `
    mutation ($endpoint: String!) { unsubscribeFromGroceryPush(endpoint: $endpoint) }
  `;
  const KEY = `query { groceryPushKey }`;

  const target = (endpoint: string): Record<string, string> => ({
    endpoint,
    p256dh: 'a-public-key',
    auth: 'an-auth-secret',
  });

  const subscriptionsOf = async (email: string): Promise<unknown[]> => {
    const account = await api.resolve(UserRepository).findRecordByEmail(email);

    return api.resolve(GroceryPushRepository).forUser(account!.id);
  };

  it('remembers a browser that agreed', async () => {
    const cookie = await signIn('matthias@example.com');

    await api.graphql(SUBSCRIBE, { input: target('https://push.example/1') }, cookie);

    expect(await subscriptionsOf('matthias@example.com')).toHaveLength(1);
  });

  it('takes over an endpoint rather than duplicating it', async () => {
    const cookie = await signIn('matthias@example.com');

    await api.graphql(SUBSCRIBE, { input: target('https://push.example/1') }, cookie);
    await api.graphql(SUBSCRIBE, { input: target('https://push.example/1') }, cookie);

    expect(await subscriptionsOf('matthias@example.com')).toHaveLength(1);
  });

  it('hands a shared browser to whoever signed in last', async () => {
    const mine = await signIn('matthias@example.com');
    const theirs = await signIn('someone-else@example.com');

    await api.graphql(SUBSCRIBE, { input: target('https://push.example/shared') }, mine);
    await api.graphql(SUBSCRIBE, { input: target('https://push.example/shared') }, theirs);

    expect(await subscriptionsOf('matthias@example.com')).toHaveLength(0);
    expect(await subscriptionsOf('someone-else@example.com')).toHaveLength(1);
  });

  it('forgets a browser that changed its mind', async () => {
    const cookie = await signIn('matthias@example.com');
    await api.graphql(SUBSCRIBE, { input: target('https://push.example/1') }, cookie);

    await api.graphql(UNSUBSCRIBE, { endpoint: 'https://push.example/1' }, cookie);

    expect(await subscriptionsOf('matthias@example.com')).toHaveLength(0);
  });

  it('will not let one account unsubscribe another one browser', async () => {
    const mine = await signIn('matthias@example.com');
    const theirs = await signIn('someone-else@example.com');
    await api.graphql(SUBSCRIBE, { input: target('https://push.example/1') }, mine);

    await api.graphql(UNSUBSCRIBE, { endpoint: 'https://push.example/1' }, theirs);

    expect(await subscriptionsOf('matthias@example.com')).toHaveLength(1);
  });

  it('offers the public key without asking anyone to sign in', async () => {
    const response = await api.graphql<{ groceryPushKey: string | null }>(KEY);

    expect(response.errors).toBeUndefined();
  });
});
