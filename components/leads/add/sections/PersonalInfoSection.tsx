import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeadFormData } from "@/lib/types/lead";

interface PersonalInfoProps {
  formData: LeadFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PersonalInfoSection({
  formData,
  onChange,
}: PersonalInfoProps) {
  return (
    <div className="p-6 border border-border rounded-xl bg-background/50 space-y-8">
      {/* Core Personal Info */}
      <div className="space-y-6">
        <h3 className="text-md font-semibold tracking-wide uppercase text-muted-foreground/80 border-b border-border pb-2">
          Personal Information
        </h3>
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">
              Contact Name *
            </Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName || ""}
              onChange={onChange}
              required
              className="h-10 bg-card border-input focus-visible:ring-1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-sm font-medium">
              Business Name
            </Label>
            <Input
              id="businessName"
              name="businessName"
              value={formData.businessName || ""}
              onChange={onChange}
              className="h-10 bg-card border-input focus-visible:ring-1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Input
              id="category"
              name="category"
              value={formData.category || ""}
              onChange={onChange}
              className="h-10 bg-card border-input focus-visible:ring-1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone || ""}
              onChange={onChange}
              className="h-10 bg-card border-input focus-visible:ring-1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternatePhone" className="text-sm font-medium">
              Alternate Phone
            </Label>
            <Input
              id="alternatePhone"
              name="alternatePhone"
              value={formData.alternatePhone || ""}
              onChange={onChange}
              className="h-10 bg-card border-input focus-visible:ring-1"
            />
          </div>

          <div className="space-y-2">
            {/* Warning: Parent onChange must handle splitting this string into an array */}
            <Label htmlFor="emails" className="text-sm font-medium">
              Emails (Comma separated)
            </Label>
            <Input
              id="emails"
              name="emails"
              value={formData.emails?.join(", ") || ""}
              onChange={onChange}
              className="h-10 bg-card border-input focus-visible:ring-1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating" className="text-sm font-medium">
              Rating
            </Label>
            <Input
              id="rating"
              name="rating"
              type="number"
              step="0.1"
              value={formData.rating || ""}
              onChange={onChange}
              className="h-10 bg-card border-input focus-visible:ring-1"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address" className="text-sm font-medium">
              Address
            </Label>
            <Input
              id="address"
              name="address"
              value={formData.address || ""}
              onChange={onChange}
              className="h-10 bg-card border-input focus-visible:ring-1"
            />
          </div>
        </div>
      </div>

      {/* Scraped Directory Links */}
      <div className="space-y-6">
        <h3 className="text-md font-semibold tracking-wide uppercase text-muted-foreground/80 border-b border-border pb-2">
          Directory & Social Links
        </h3>
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium">
              Website
            </Label>
            <Input
              id="website"
              name="website"
              value={formData.website || ""}
              onChange={onChange}
              className="h-10 bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gmbLink" className="text-sm font-medium">
              Google Maps Link
            </Label>
            <Input
              id="gmbLink"
              name="gmbLink"
              value={formData.gmbLink || ""}
              onChange={onChange}
              className="h-10 bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="socials.facebook" className="text-sm font-medium">
              Facebook
            </Label>
            <Input
              id="facebook"
              name="socials.facebook"
              value={formData.socials?.facebook || ""}
              onChange={onChange}
              className="h-10 bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="socials.instagram" className="text-sm font-medium">
              Instagram
            </Label>
            <Input
              id="instagram"
              name="socials.instagram"
              value={formData.socials?.instagram || ""}
              onChange={onChange}
              className="h-10 bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="socials.linkedin" className="text-sm font-medium">
              LinkedIn
            </Label>
            <Input
              id="linkedin"
              name="socials.linkedin"
              value={formData.socials?.linkedin || ""}
              onChange={onChange}
              className="h-10 bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="socials.youtube" className="text-sm font-medium">
              YouTube
            </Label>
            <Input
              id="youtube"
              name="socials.youtube"
              value={formData.socials?.youtube || ""}
              onChange={onChange}
              className="h-10 bg-card"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
