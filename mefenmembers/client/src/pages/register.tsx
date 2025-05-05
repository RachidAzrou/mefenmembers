import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { ref, push, get } from "firebase/database";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";

const registerSchema = z.object({
  firstName: z.string()
    .min(1, "Voornaam is verplicht")
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Voornaam mag niet leeg zijn"),
  lastName: z.string()
    .min(1, "Achternaam is verplicht")
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Achternaam mag niet leeg zijn"),
  phoneNumber: z.string()
    .min(1, "Telefoonnummer is verplicht")
    .transform(val => val.replace(/[^\d]/g, ''))
    .refine(val => val.length >= 10, "Telefoonnummer moet minimaal 10 cijfers bevatten")
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const normalizeString = (str: string) => {
    return str.replace(/\s+/g, ' ').toLowerCase().trim();
  };

  const normalizePhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('31')) {
      return cleaned.substring(2);
    }
    return cleaned;
  };

  const checkForDuplicates = async (data: RegisterFormData) => {
    try {
      const normalizedInput = {
        firstName: normalizeString(data.firstName),
        lastName: normalizeString(data.lastName),
        phoneNumber: normalizePhoneNumber(data.phoneNumber)
      };

      const pendingRef = ref(db, "pending_volunteers");
      const pendingSnapshot = await get(pendingRef);
      const pendingVolunteers = pendingSnapshot.val() || {};

      const volunteersRef = ref(db, "volunteers");
      const volunteersSnapshot = await get(volunteersRef);
      const volunteers = volunteersSnapshot.val() || {};

      const isDuplicate = [...Object.values(pendingVolunteers), ...Object.values(volunteers)].some(
        (volunteer: any) => {
          if (!volunteer?.firstName || !volunteer?.lastName || !volunteer?.phoneNumber) {
            return false;
          }

          const normalizedVolunteer = {
            firstName: normalizeString(volunteer.firstName),
            lastName: normalizeString(volunteer.lastName),
            phoneNumber: normalizePhoneNumber(volunteer.phoneNumber)
          };

          const nameMatch =
            normalizedVolunteer.firstName === normalizedInput.firstName &&
            normalizedVolunteer.lastName === normalizedInput.lastName;

          const phoneMatch = normalizedVolunteer.phoneNumber === normalizedInput.phoneNumber;

          return nameMatch || phoneMatch;
        }
      );

      return isDuplicate;
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      return false;
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setRegistrationStatus(null);

      const isDuplicate = await checkForDuplicates(data);

      if (isDuplicate) {
        setRegistrationStatus({
          type: 'error',
          message: 'Er bestaat al een registratie met deze gegevens.'
        });
        return;
      }

      const normalizedData = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phoneNumber: normalizePhoneNumber(data.phoneNumber),
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };

      await push(ref(db, "pending_volunteers"), normalizedData);

      setRegistrationStatus({
        type: 'success',
        message: 'Dankjewel voor je aanmelding! We nemen snel contact met je op.'
      });
      form.reset();
    } catch (error) {
      setRegistrationStatus({
        type: 'error',
        message: 'Er is iets misgegaan bij het aanmelden.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-no-repeat bg-cover bg-center relative px-4 py-6 sm:py-8 md:py-12"
         style={{ backgroundImage: `url('/static/123.jpg')` }}>
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-[500px]">
        <Card className="bg-white border-0 shadow-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-full flex justify-center items-center">
                <img
                  src="/static/Naamloos.png"
                  alt="MEFEN"
                  className="h-16 sm:h-20 md:h-24 mx-auto mb-3 sm:mb-4"
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#963E56]">
                Word Vrijwilliger
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2 px-4">
                Vul het formulier in om je aan te melden als vrijwilliger
              </p>
            </div>

            {registrationStatus && (
                <div className={`mb-6 p-6 rounded-lg text-center ${
                  registrationStatus.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <p className="text-base font-medium">
                    {registrationStatus.type === 'success'
                      ? 'Dankjewel voor je aanmelding! We nemen snel contact met je op.'
                      : registrationStatus.message
                    }
                  </p>
                </div>
              )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Voornaam</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Voornaam"
                          className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-[#963E56] focus:ring-[#963E56]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Achternaam</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Achternaam"
                          className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-[#963E56] focus:ring-[#963E56]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Telefoonnummer</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Telefoonnummer"
                          className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-[#963E56] focus:ring-[#963E56]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium bg-[#963E56] hover:bg-[#963E56]/90 transition-colors duration-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Bezig met aanmelden..." : "Aanmelden"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-xs sm:text-sm text-white/90 mt-4 sm:mt-6 font-medium">
          MEFEN Vrijwilligers Management Systeem
        </p>
      </div>
    </div>
  );
}