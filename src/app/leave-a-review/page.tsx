
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { products } from '@/lib/data';
import { Star, Upload, Send } from 'lucide-react';
import Link from 'next/link';

const StarRating = ({ rating, setRating }: { rating: number; setRating: (rating: number) => void }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-8 w-8 cursor-pointer transition-colors ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => setRating(star)}
        />
      ))}
    </div>
  );
};

export default function LeaveReviewPage() {
  const [rating, setRating] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
       <div className="absolute top-4 left-4">
            <Button variant="outline" asChild>
                <Link href="/product-locator">
                    &larr; Back to Product Locator
                </Link>
            </Button>
        </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Leave a Review</CardTitle>
          <CardDescription>
            Share your experience to help others in the community. Please upload a photo of your receipt or the product's Certificate of Analysis (COA) to verify your review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="product">Which product are you reviewing?</Label>
              <Select>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Your Rating</Label>
              <StarRating rating={rating} setRating={setRating} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-text">Your Review</Label>
              <Textarea
                id="review-text"
                placeholder="What did you like or dislike? How was your experience?"
                rows={6}
              />
            </div>

            <div className="space-y-2">
                <Label>Verification (Receipt or COA)</Label>
                <div className="flex items-center justify-center w-full">
                    <Label htmlFor="verification-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                             {fileName ? (
                                <p className="font-semibold text-sm text-primary">{fileName}</p>
                            ) : (
                                <>
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG, or PDF (up to 5MB)</p>
                                </>
                            )}
                        </div>
                        <Input id="verification-upload" type="file" className="hidden" accept="image/png, image/jpeg, application/pdf" onChange={handleFileChange} />
                    </Label>
                </div>
            </div>

            <Button type="submit" className="w-full">
                <Send className="mr-2" />
                Submit Review
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    