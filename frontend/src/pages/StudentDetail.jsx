import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  BookOpen,
  Calendar,
  MapPin,
  CreditCard,
  GraduationCap,
} from "lucide-react";

const STATUS_VARIANT = { active: "success", completed: "info", dropped: "destructive" };

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get(`/api/students/${id}/`)
      .then(({ data }) => setStudent(data))
      .catch(() => setError("Could not load student details."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <Button
          id="back-to-students"
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate("/students")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {loading ? "Loading…" : (student?.name ?? "Student Detail")}
          </h1>
          <p className="text-sm text-muted-foreground">Student profile</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {student && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Personal info card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Personal Info
              </p>
              <Badge variant={STATUS_VARIANT[student.status] ?? "secondary"}>
                {student.status}
              </Badge>
            </div>

            {/* Avatar + name */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary uppercase">
                {student.name?.[0] ?? "?"}
              </div>
              <div>
                <p className="font-semibold text-foreground">{student.name}</p>
                <p className="text-sm text-muted-foreground">{student.email || "—"}</p>
              </div>
            </div>

            <InfoRow icon={User}       label="Father's Name"  value={student.father_name}    />
            <InfoRow icon={Phone}      label="Phone"          value={student.phone}          />
            <InfoRow icon={Mail}       label="Email"          value={student.email}          />
            <InfoRow icon={Calendar}   label="Date of Birth"  value={student.dob}            />
            <InfoRow icon={User}       label="Gender"         value={student.gender}         />
            <InfoRow icon={MapPin}     label="Address"        value={student.address}        />
          </div>

          {/* Academic info card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Academic Info
            </p>
            <InfoRow icon={BookOpen}      label="Course"         value={student.course?.name}   />
            <InfoRow icon={Calendar}      label="Join Date"      value={student.join_date}       />
            <InfoRow icon={GraduationCap} label="Qualification"  value={student.qualification}  />
            <InfoRow icon={CreditCard}    label="Aadhaar Number" value={student.aadhaar_number} />
          </div>
        </div>
      )}
    </div>
  );
}
