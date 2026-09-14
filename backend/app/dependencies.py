"""
NEXUS AQUA - FastAPI Dependencies
JWT verification + role-based access control enforcement
All role checks are server-side — never trust the client.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth import decode_access_token
from app.models import User, UserStatus, UserRole

# Bearer token scheme
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency: Extracts and validates the JWT Bearer token.
    Returns the authenticated User object from the database.
    Raises 401 if token is invalid/expired.
    Raises 403 if account is not active.
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status.value}. Contact administrator.",
        )

    return user


def require_roles(allowed_roles: List[UserRole]):
    """
    Dependency factory: Returns a dependency that enforces role-based access.
    Raises 403 if the authenticated user's role is not in allowed_roles.
    This check is always server-side.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {[r.value for r in allowed_roles]}",
            )
        return current_user
    return role_checker


# ─── Convenience role dependencies ───────────────────────────────────────────

def admin_only(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user


def survey_operator_access(current_user: User = Depends(get_current_user)) -> User:
    allowed = [UserRole.admin, UserRole.survey_operator]
    if current_user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Survey Operator or Admin access required",
        )
    return current_user


def marine_expert_access(current_user: User = Depends(get_current_user)) -> User:
    allowed = [UserRole.admin, UserRole.marine_expert]
    if current_user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Marine Expert or Admin access required",
        )
    return current_user


def environment_officer_access(current_user: User = Depends(get_current_user)) -> User:
    allowed = [UserRole.admin, UserRole.environment_officer]
    if current_user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Environment Officer or Admin access required",
        )
    return current_user


def researcher_access(current_user: User = Depends(get_current_user)) -> User:
    allowed = [UserRole.admin, UserRole.researcher]
    if current_user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researcher or Admin access required",
        )
    return current_user
