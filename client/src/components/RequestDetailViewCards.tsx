// Opmerking: dit bestand is speciaal gemaakt om de correcte gegevens weer te geven zonder standaardwaarden

interface MemberRequest {
  id: number;
  status: "pending" | "approved" | "rejected";
  firstName: string;
  lastName: string;
  gender: string | null;
  birthDate: string | null;
  nationality: string | null;
  email: string;
  phoneNumber: string;
  street: string | null;
  houseNumber: string | null;
  busNumber: string | null;
  postalCode: string | null;
  city: string | null;
  membershipType: "standaard" | "student" | "senior";
  requestDate: string;
  processedDate: string | null;
  processedBy: number | null;
  notes: string | null;
  privacyConsent: boolean;
  // Uitgebreide velden voor betaling en bankgegevens
  paymentMethod?: "cash" | "domiciliering" | "overschrijving" | "bancontact";
  paymentTerm?: "maandelijks" | "driemaandelijks" | "jaarlijks";
  autoRenew?: boolean;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  bicSwift?: string | null;
  rejectionReason?: string | null;
}

export function formatMembershipTypeLabel(membershipType: string | undefined | null): string {
  switch (membershipType) {
    case "standaard": return "Standaard";
    case "student": return "Student";
    case "senior": return "Senior";
    default: return "";
  }
}

export function formatPaymentMethodLabel(paymentMethod: string | undefined | null): string {
  switch (paymentMethod) {
    case "cash": return "Cash";
    case "bancontact": return "Bancontact";
    case "overschrijving": return "Overschrijving";
    case "domiciliering": return "Domiciliëring";
    default: return "";
  }
}

export function formatPaymentTermLabel(paymentTerm: string | undefined | null): string {
  switch (paymentTerm) {
    case "maandelijks": return "Maandelijks";
    case "driemaandelijks": return "Driemaandelijks";
    case "jaarlijks": return "Jaarlijks";
    default: return "";
  }
}

export function formatAutoRenewLabel(autoRenew: boolean | undefined | null): string {
  if (autoRenew === true) return "Ja";
  if (autoRenew === false) return "Nee";
  return "";
}

export function MembershipCard({ request }: { request: MemberRequest | null }) {
  if (!request) return null;
  
  return (
    <div>
      <p className="text-sm font-medium text-[#963E56] mb-2">Lidmaatschap</p>
      <div className="bg-white p-3 rounded-md border border-[#963E56]/20">
        <p className="text-xs text-gray-600 font-medium mb-1">Type</p>
        <p className="font-medium">
          {formatMembershipTypeLabel(request.membershipType)}
        </p>
      </div>
      <div className="bg-white p-3 rounded-md border border-[#963E56]/20 mt-2">
        <p className="text-xs text-gray-600 font-medium mb-1">Betaalwijze</p>
        <p className="font-medium">
          {formatPaymentMethodLabel(request.paymentMethod)}
        </p>
      </div>
    </div>
  );
}

export function PaymentDetailsCard({ request }: { request: MemberRequest | null }) {
  if (!request) return null;
  
  return (
    <div>
      <p className="text-sm font-medium text-[#963E56] mb-2">Betalingsdetails</p>
      <div className="bg-white p-3 rounded-md border border-[#963E56]/20">
        <p className="text-xs text-gray-600 font-medium mb-1">Betalingstermijn</p>
        <p className="font-medium">
          {formatPaymentTermLabel(request.paymentTerm)}
        </p>
      </div>
      <div className="bg-white p-3 rounded-md border border-[#963E56]/20 mt-2">
        <p className="text-xs text-gray-600 font-medium mb-1">Automatische verlenging</p>
        <p className="font-medium">
          {formatAutoRenewLabel(request.autoRenew)}
        </p>
      </div>
      
      {request.paymentMethod === "domiciliering" && (
        <>
          <div className="bg-white p-3 rounded-md border border-[#963E56]/20 mt-2">
            <p className="text-xs text-gray-600 font-medium mb-1">Bankrekeningnummer</p>
            <p className="font-medium">
              {request.accountNumber || ""}
            </p>
          </div>
          <div className="bg-white p-3 rounded-md border border-[#963E56]/20 mt-2">
            <p className="text-xs text-gray-600 font-medium mb-1">Rekeninghouder</p>
            <p className="font-medium">
              {request.accountHolderName || ""}
            </p>
          </div>
          <div className="bg-white p-3 rounded-md border border-[#963E56]/20 mt-2">
            <p className="text-xs text-gray-600 font-medium mb-1">BIC/SWIFT</p>
            <p className="font-medium">
              {request.bicSwift || ""}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function LocationCard({ request }: { request: MemberRequest | null }) {
  if (!request) return null;
  
  return (
    <div>
      <p className="text-sm font-medium text-[#963E56] mb-2">Locatie</p>
      <div className="bg-white p-3 rounded-md border border-[#963E56]/20">
        <p className="text-xs text-gray-600 font-medium mb-1">Gemeente</p>
        <p className="font-medium">{request.city || ""}</p>
      </div>
      <div className="bg-white p-3 rounded-md border border-[#963E56]/20 mt-2">
        <p className="text-xs text-gray-600 font-medium mb-1">Adres</p>
        <p className="font-medium">
          {request.street} {request.houseNumber}
          {request.busNumber && `, bus ${request.busNumber}`}
        </p>
      </div>
    </div>
  );
}