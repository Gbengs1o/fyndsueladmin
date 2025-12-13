'use server';

/**
 * @fileOverview This file contains a Genkit flow for automatically flagging suspicious price submissions.
 *
 * It identifies price entries that deviate significantly (e.g., 50%) from the average price.
 *
 * - flagSuspiciousPrice - A function that handles the flagging process.
 * - FlagSuspiciousPriceInput - The input type for the flagSuspiciousPrice function.
 * - FlagSuspiciousPriceOutput - The return type for the flagSuspiciousPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlagSuspiciousPriceInputSchema = z.object({
  price: z.number().describe('The submitted price.'),
  averagePrice: z.number().describe('The average price for the product.'),
  deviationThreshold: z
    .number()
    .default(0.5)
    .describe(
      'The threshold for flagging a price as suspicious (e.g., 0.5 for 50% deviation).'
    ),
});
export type FlagSuspiciousPriceInput = z.infer<typeof FlagSuspiciousPriceInputSchema>;

const FlagSuspiciousPriceOutputSchema = z.object({
  isSuspicious: z
    .boolean()
    .describe('Whether the submitted price is flagged as suspicious.'),
  reason: z.string().optional().describe('The reason for flagging the price.'),
});
export type FlagSuspiciousPriceOutput = z.infer<typeof FlagSuspiciousPriceOutputSchema>;

export async function flagSuspiciousPrice(input: FlagSuspiciousPriceInput): Promise<FlagSuspiciousPriceOutput> {
  return flagSuspiciousPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'flagSuspiciousPricePrompt',
  input: {schema: FlagSuspiciousPriceInputSchema},
  output: {schema: FlagSuspiciousPriceOutputSchema},
  prompt: `You are an expert system for flagging suspicious prices.

You are given a submitted price, the average price, and a deviation threshold.

Determine if the submitted price is suspicious based on whether it deviates from the average price by more than the deviation threshold.

Submitted Price: {{price}}
Average Price: {{averagePrice}}
Deviation Threshold: {{deviationThreshold}}

Consider a price suspicious if it deviates more than {{deviationThreshold}} from the average price.
Return a reason if the price is suspicious.
`,
});

const flagSuspiciousPriceFlow = ai.defineFlow(
  {
    name: 'flagSuspiciousPriceFlow',
    inputSchema: FlagSuspiciousPriceInputSchema,
    outputSchema: FlagSuspiciousPriceOutputSchema,
  },
  async input => {
    const deviation = Math.abs(input.price - input.averagePrice) / input.averagePrice;
    const isSuspicious = deviation > input.deviationThreshold;

    let reason = undefined;
    if (isSuspicious) {
      reason = `Price deviates by ${deviation * 100}% from the average price.`;
    }

    const {output} = await prompt({...input, isSuspicious, reason});
    return {
      isSuspicious: isSuspicious,
      reason: reason,
    };
  }
);
