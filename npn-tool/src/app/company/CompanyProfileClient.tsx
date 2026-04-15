"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";

interface Profile {
  id: string; legalName: string; dbaName: string; companyCode: string;
  seniorOfficial: string; seniorTitle: string; address: string; city: string;
  province: string; postalCode: string; country: string; phone: string; email: string;
  siteLicenceNumber: string; qapName: string; qapQualifications: string; epostRegistered: boolean;
}

interface Facility {
  id: string; facilityType: string; name: string; address: string; city: string;
  province: string; postalCode: string; country: string; phone: string; email: string;
  siteLicenceNumber: string; siteLicenceStatus: string; activities: string;
  gmpCertified: boolean; managerName: string; managerPhone: string; managerEmail: string; managerRole: string;
  fsrn: string; notes: string;
}

interface Member {
  id: string; name: string; role: string; title: string; department: string;
  phone: string; phoneExt: string; email: string;
  isQAP: boolean; isSeniorOfficial: boolean; isAuthorizedSignatory: boolean; isHCContact: boolean;
  notes: string;
}

const facilityTypes: Record<string, string> = {
  warehouse: "Warehouse", "3pl": "3PL Partner", foreign_manufacturer: "Foreign Manufacturer",
  foreign_packager: "Foreign Packager", office: "Office",
};

const roleLabels: Record<string, string> = {
  ceo: "CEO / Executive", regulatory: "Regulatory Affairs", warehouse_manager: "Warehouse Manager",
  qap: "Quality Assurance Person", hr: "Human Resources", customer_service: "Customer Service",
  compliance: "Compliance", project_management: "Project Management", operations: "Operations",
};

export default function CompanyProfileClient({
  user, profile: initialProfile, facilities: initialFacilities, team: initialTeam,
}: {
  user: { id: string; name: string; role: string; username: string };
  profile: Profile; facilities: Facility[]; team: Member[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [facilities, setFacilities] = useState(initialFacilities);
  const [team, setTeam] = useState(initialTeam);
  const [tab, setTab] = useState("company");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isEditable = user.role !== "viewer";

  const saveProfile = async () => {
    setSaving(true);
    const res = await fetch("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  const addFacility = async () => {
    const res = await fetch("/api/facilities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Facility" }) });
    if (res.ok) { const f = await res.json(); setFacilities([...facilities, f]); }
  };

  const saveFacility = async (f: Facility) => {
    await fetch(`/api/facilities/${f.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
  };

  const deleteFacility = async (id: string) => {
    await fetch(`/api/facilities/${id}`, { method: "DELETE" });
    setFacilities(facilities.filter(f => f.id !== id));
  };

  const addMember = async () => {
    const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Member" }) });
    if (res.ok) { const m = await res.json(); setTeam([...team, m]); }
  };

  const saveMember = async (m: Member) => {
    await fetch(`/api/team/${m.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) });
  };

  const deleteMember = async (id: string) => {
    await fetch(`/api/team/${id}`, { method: "DELETE" });
    setTeam(team.filter(m => m.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <GlobalSearch />

      <main className="flex-1 p-6 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Company Profile</h2>
          {isEditable && tab === "company" && (
            <button onClick={saveProfile} disabled={saving}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          {[
            { key: "company", label: "Company Info" },
            { key: "facilities", label: `Facilities (${facilities.length})` },
            { key: "team", label: `Team (${team.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 ${tab === t.key ? "border-red-600 text-red-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Company Info Tab */}
        {tab === "company" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Company Info</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: "legalName", label: "Legal Name" }, { key: "dbaName", label: "DBA / Trade Name" },
                  { key: "companyCode", label: "HC Company Code" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500">{f.label}</label>
                    <input type="text" value={String((profile as unknown as Record<string, unknown>)[f.key] || "")} disabled={!isEditable}
                      onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Location</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: "address", label: "Address" }, { key: "city", label: "City" },
                  { key: "province", label: "Province" }, { key: "postalCode", label: "Postal Code" },
                  { key: "country", label: "Country" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500">{f.label}</label>
                    <input type="text" value={String((profile as unknown as Record<string, unknown>)[f.key] || "")} disabled={!isEditable}
                      onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Regulatory</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: "seniorOfficial", label: "Senior Official" }, { key: "seniorTitle", label: "Title" },
                  { key: "siteLicenceNumber", label: "Site Licence #" },
                  { key: "qapName", label: "QAP Name" }, { key: "qapQualifications", label: "QAP Qualifications" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500">{f.label}</label>
                    <input type="text" value={String((profile as unknown as Record<string, unknown>)[f.key] || "")} disabled={!isEditable}
                      onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500">ePost Connect Registered</label>
                  <div className="mt-2">
                    <input type="checkbox" checked={profile.epostRegistered} disabled={!isEditable}
                      onChange={e => setProfile({ ...profile, epostRegistered: e.target.checked })} className="rounded" />
                    <span className="ml-2 text-sm text-gray-700">{profile.epostRegistered ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Facilities Tab */}
        {tab === "facilities" && (
          <div>
            <div className="flex justify-end mb-4">
              {isEditable && <button onClick={addFacility} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">+ Add Facility</button>}
            </div>
            <div className="space-y-4">
              {facilities.map((f, fi) => (
                <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        f.facilityType === "warehouse" ? "bg-blue-100 text-blue-700" :
                        f.facilityType === "3pl" ? "bg-purple-100 text-purple-700" :
                        f.facilityType.startsWith("foreign") ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{facilityTypes[f.facilityType] || f.facilityType}</span>
                      <input type="text" value={f.name} disabled={!isEditable}
                        onChange={e => { const u = [...facilities]; u[fi] = { ...f, name: e.target.value }; setFacilities(u); }}
                        onBlur={() => saveFacility(f)}
                        className="text-lg font-semibold text-gray-900 border-none p-0 focus:ring-0 bg-transparent flex-1 min-w-0" />
                    </div>
                    <div className="flex gap-2">
                      <select value={f.facilityType} disabled={!isEditable}
                        onChange={e => { const u = [...facilities]; u[fi] = { ...f, facilityType: e.target.value }; setFacilities(u); saveFacility({ ...f, facilityType: e.target.value }); }}
                        className="text-xs border border-gray-300 rounded px-2 py-1">
                        {Object.entries(facilityTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      {isEditable && <button onClick={() => deleteFacility(f.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Remove</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    {[
                      { key: "address", label: "Address" }, { key: "city", label: "City" },
                      { key: "province", label: "Province" }, { key: "postalCode", label: "Postal Code" },
                      { key: "country", label: "Country" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" },
                      { key: "siteLicenceNumber", label: "Site Licence #" },
                      { key: "managerName", label: "Manager" }, { key: "managerPhone", label: "Manager Phone" },
                      { key: "managerEmail", label: "Manager Email" }, { key: "managerRole", label: "Manager Role" },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="text-xs text-gray-400">{field.label}</label>
                        <input type="text" value={String((f as unknown as Record<string, unknown>)[field.key] || "")} disabled={!isEditable}
                          onChange={e => { const u = [...facilities]; u[fi] = { ...f, [field.key]: e.target.value }; setFacilities(u); }}
                          onBlur={() => saveFacility(facilities[fi])}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm mt-0.5" />
                      </div>
                    ))}
                  </div>
                  {f.facilityType.startsWith("foreign") && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-gray-400">FSRN (Foreign Site Reference #)</label>
                        <input type="text" value={f.fsrn} disabled={!isEditable}
                          onChange={e => { const u = [...facilities]; u[fi] = { ...f, fsrn: e.target.value }; setFacilities(u); }}
                          onBlur={() => saveFacility(facilities[fi])}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm mt-0.5" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {facilities.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                  No facilities. Add your warehouse, 3PL partners, and foreign sites.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Tab */}
        {tab === "team" && (
          <div>
            <div className="flex justify-end mb-4">
              {isEditable && <button onClick={addMember} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">+ Add Member</button>}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3 w-32">Role</th>
                    <th className="text-left px-4 py-3 min-w-[180px]">Title</th>
                    <th className="text-left px-4 py-3">Department</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-left px-4 py-3 min-w-[200px]">Email</th>
                    <th className="text-left px-4 py-3">Tags</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {team.map((m, mi) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input type="text" value={m.name} disabled={!isEditable}
                          onChange={e => { const u = [...team]; u[mi] = { ...m, name: e.target.value }; setTeam(u); }}
                          onBlur={() => saveMember(team[mi])}
                          className="text-sm font-medium text-gray-900 border-none p-0 bg-transparent w-full" />
                      </td>
                      <td className="px-4 py-3">
                        <select value={m.role} disabled={!isEditable}
                          onChange={e => { const u = [...team]; u[mi] = { ...m, role: e.target.value }; setTeam(u); saveMember({ ...m, role: e.target.value }); }}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1">
                          <option value="">—</option>
                          {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={m.title} disabled={!isEditable}
                          onChange={e => { const u = [...team]; u[mi] = { ...m, title: e.target.value }; setTeam(u); }}
                          onBlur={() => saveMember(team[mi])}
                          className="text-xs text-gray-600 border-none p-0 bg-transparent w-full" />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{m.department}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{m.phone}{m.phoneExt ? ` x${m.phoneExt}` : ""}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{m.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.isSeniorOfficial && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Senior Official</span>}
                          {m.isQAP && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">QAP</span>}
                          {m.isHCContact && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">HC Contact</span>}
                          {m.isAuthorizedSignatory && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Signatory</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditable && <button onClick={() => deleteMember(m.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Remove</button>}
                      </td>
                    </tr>
                  ))}
                  {team.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No team members. Add your warehouse managers, regulatory contacts, and key personnel.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
