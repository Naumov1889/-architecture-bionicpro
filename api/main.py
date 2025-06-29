from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
import requests
from typing import List, Dict, Any
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="Reports API",
    description="API for generating usage reports with Keycloak authentication",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "reports-realm")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "reports-api")

security = HTTPBearer()


class KeycloakAuth:
    def __init__(self):
        self.realm_url = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}"
        self.public_key = None
        self._get_public_key()

    def _get_public_key(self):
        """Get Keycloak public key for token verification"""
        try:
            response = requests.get(f"{self.realm_url}")
            realm_info = response.json()
            self.public_key = f"-----BEGIN PUBLIC KEY-----\n{realm_info['public_key']}\n-----END PUBLIC KEY-----"
        except Exception as e:
            print(f"Failed to get Keycloak public key: {e}")
            # Fallback: get from certs endpoint
            try:
                certs_response = requests.get(
                    f"{self.realm_url}/protocol/openid_connect/certs"
                )
                certs = certs_response.json()
                # Use first key for simplicity
                if certs.get("keys"):
                    self.public_key = certs["keys"][0]
            except Exception as e2:
                print(f"Fallback key retrieval also failed: {e2}")

    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token and return claims"""
        try:
            # For development, we'll decode without verification
            # In production, use proper key verification
            payload = jwt.decode(
                token,
                key=self.public_key,  # Use actual Keycloak public key
                algorithms=["RS256"],
                options={"verify_signature": True},
            )
            return payload
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )


keycloak_auth = KeycloakAuth()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract user info from JWT token"""
    token = credentials.credentials
    user_info = keycloak_auth.verify_token(token)
    return user_info


def require_role(required_roles: List[str]):
    """Dependency to check if user has required roles"""

    def role_checker(user: Dict = Depends(get_current_user)):
        user_roles = user.get("realm_access", {}).get("roles", [])
        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {required_roles}",
            )
        return user

    return role_checker


# Data generators
class ReportGenerator:
    @staticmethod
    def generate_usage_data(days: int = 30) -> List[Dict]:
        """Generate mock usage data"""
        data = []
        base_date = datetime.now() - timedelta(days=days)

        users = ["user1", "user2", "admin1", "prothetic1", "prothetic2", "prothetic3"]
        actions = [
            "login",
            "view_report",
            "download_report",
            "create_entry",
            "update_profile",
        ]

        for i in range(min(days * 5, 100)):  # Limit to 100 entries max
            entry = {
                "id": i + 1,
                "user": random.choice(users),
                "action": random.choice(actions),
                "timestamp": (
                    base_date
                    + timedelta(
                        days=random.randint(0, days - 1),
                        hours=random.randint(0, 23),
                        minutes=random.randint(0, 59),
                    )
                ).isoformat(),
                "duration_seconds": random.randint(10, 300),
                "ip_address": f"192.168.1.{random.randint(1, 254)}",
                "success": random.choice([True, True, True, False]),  # 75% success rate
            }
            data.append(entry)

        return sorted(data, key=lambda x: x["timestamp"], reverse=True)

    @staticmethod
    def generate_analytics_data() -> Dict:
        """Generate analytics summary"""
        return {
            "total_users": random.randint(50, 100),
            "active_users_today": random.randint(15, 30),
            "active_users_week": random.randint(35, 60),
            "total_logins": random.randint(500, 1500),
            "failed_logins": random.randint(20, 80),
            "reports_generated": random.randint(100, 300),
            "average_session_duration": random.randint(300, 1800),
            "top_actions": [
                {"action": "login", "count": random.randint(400, 600)},
                {"action": "view_report", "count": random.randint(200, 400)},
                {"action": "download_report", "count": random.randint(100, 200)},
                {"action": "create_entry", "count": random.randint(50, 150)},
                {"action": "update_profile", "count": random.randint(30, 80)},
            ],
        }


# Text report generators
def generate_text_report(
    usage_data: List[Dict], analytics: Dict, format_type: str
) -> str:
    """Generate text-based reports"""

    return f"""
USAGE REPORT (Text Format)
==========================

Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

Summary: {len(usage_data)} usage records found
Analytics: {analytics["total_users"]} total users, {analytics["active_users_today"]} active today

Recent Activity:
{chr(10).join([f"- {entry['user']} performed {entry['action']} at {entry['timestamp'][:19]}" for entry in usage_data[:5]])}

--- End of Text Report ---
        """


# API Routes
@app.get("/")
async def root():
    return {"message": "Reports API is running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get(
    "/reports",
    dependencies=[Depends(require_role(["prothetic_user", "administrator"]))],
)
async def get_reports(
    format: str = Query("json", enum=["json", "pdf", "excel", "text"]),
    days: int = Query(30, ge=1, le=365),
    user: Dict = Depends(get_current_user),
):
    """Get usage reports in various formats"""

    # Generate data
    usage_data = ReportGenerator.generate_usage_data(days)
    analytics = ReportGenerator.generate_analytics_data()

    if format == "json":
        return {
            "report_type": "usage_report",
            "generated_at": datetime.now().isoformat(),
            "generated_by": user.get("preferred_username", "unknown"),
            "period_days": days,
            "analytics": analytics,
            "usage_data": usage_data,
        }

    else:  # pdf, excel, or text
        report_text = generate_text_report(usage_data, analytics, format)
        return {
            "report_type": f"usage_report_{format}",
            "generated_at": datetime.now().isoformat(),
            "generated_by": user.get("preferred_username", "unknown"),
            "period_days": days,
            "content": report_text,
            "note": f"This is a text representation of a {format.upper()} report",
        }


@app.get("/reports/analytics", dependencies=[Depends(require_role(["administrator"]))])
async def get_analytics(user: Dict = Depends(get_current_user)):
    """Get detailed analytics - admin only"""
    analytics = ReportGenerator.generate_analytics_data()

    # Add admin-specific data
    analytics["admin_data"] = {
        "system_uptime": f"{random.randint(1, 30)} days",
        "database_size": f"{random.randint(100, 500)} MB",
        "error_rate": f"{random.uniform(0.1, 2.0):.2f}%",
        "response_time_avg": f"{random.randint(50, 200)} ms",
    }

    return {
        "analytics": analytics,
        "generated_at": datetime.now().isoformat(),
        "generated_by": user.get("preferred_username", "unknown"),
    }


@app.get("/user/profile")
async def get_user_profile(user: Dict = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "username": user.get("preferred_username"),
        "email": user.get("email"),
        "first_name": user.get("given_name"),
        "last_name": user.get("family_name"),
        "roles": user.get("realm_access", {}).get("roles", []),
        "last_login": datetime.now().isoformat(),
        "permissions": {
            "can_view_reports": any(
                role in user.get("realm_access", {}).get("roles", [])
                for role in ["prothetic_user", "administrator"]
            ),
            "can_manage_users": "administrator"
            in user.get("realm_access", {}).get("roles", []),
        },
    }


@app.get("/reports/users", dependencies=[Depends(require_role(["administrator"]))])
async def get_user_reports(user: Dict = Depends(get_current_user)):
    """Get user activity reports - admin only"""
    users_data = []
    users = ["user1", "user2", "admin1", "prothetic1", "prothetic2", "prothetic3"]

    for username in users:
        user_data = {
            "username": username,
            "last_login": (
                datetime.now() - timedelta(days=random.randint(0, 7))
            ).isoformat(),
            "total_logins": random.randint(10, 100),
            "reports_accessed": random.randint(0, 50),
            "avg_session_duration": random.randint(300, 1800),
            "role": "administrator"
            if "admin" in username
            else "prothetic_user"
            if "prothetic" in username
            else "user",
        }
        users_data.append(user_data)

    return {
        "users": users_data,
        "total_users": len(users_data),
        "generated_at": datetime.now().isoformat(),
        "generated_by": user.get("preferred_username", "unknown"),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
