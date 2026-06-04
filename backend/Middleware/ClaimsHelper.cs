using System.Security.Claims;

namespace PharmacyApi.Middleware
{
    public static class ClaimsHelper
    {
        public static int    GetUserId(this ClaimsPrincipal u)    => int.Parse(u.FindFirstValue("userId")    ?? "0");
        public static int    GetSessionId(this ClaimsPrincipal u) => int.Parse(u.FindFirstValue("sessionId") ?? "0");
        public static string GetRole(this ClaimsPrincipal u)      => u.FindFirstValue(ClaimTypes.Role) ?? "";
        public static bool   IsAdmin(this ClaimsPrincipal u)      => u.GetRole() == "Admin";
        public static bool   CanManageInventory(this ClaimsPrincipal u) => u.GetRole() is "Admin" or "Pharmacist";
    }
}
