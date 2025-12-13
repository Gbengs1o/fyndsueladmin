"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { flagSuspiciousPrice, type FlagSuspiciousPriceOutput } from "@/ai/flows/flag-suspicious-prices";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Terminal } from "lucide-react";

const formSchema = z.object({
  price: z.coerce.number().min(1, { message: "Price must be greater than 0." }),
  averagePrice: z.coerce.number().min(1, { message: "Average price must be greater than 0." }),
});

export function PriceModerationTool() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FlagSuspiciousPriceOutput | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        price: 750,
        averagePrice: 720,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const output = await flagSuspiciousPrice(values);
      setResult(output);
    } catch (error) {
      console.error(error);
      // You could show a toast here
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Moderation Tool</CardTitle>
        <CardDescription>
          Manually check if a price is suspicious using the AI model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submitted Price (₦)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="averagePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Average Price (₦)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Analyzing..." : "Check Price"}
            </Button>
          </form>
        </Form>

        {result && (
          <Alert className="mt-4" variant={result.isSuspicious ? "destructive" : "default"}>
            <Terminal className="h-4 w-4" />
            <AlertTitle>
              {result.isSuspicious ? "Suspicious Price Flagged" : "Price Seems Normal"}
            </AlertTitle>
            <AlertDescription>
              {result.reason ? result.reason : "The submitted price is within the normal deviation threshold."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
