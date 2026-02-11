import Swal from 'sweetalert2'

const brandColors = {
  blue: '#0084D4',
  gold: '#F5D547',
  red: '#C83C3C',
}

export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  },
})

export function showSuccess(title: string, text?: string) {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonColor: brandColors.blue,
    timer: 2500,
    timerProgressBar: true,
  })
}

export function showError(title: string, text?: string) {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: brandColors.red,
  })
}

export function showWarning(title: string, text?: string) {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonColor: brandColors.gold,
    confirmButtonText: 'OK',
  })
}

export function showConfirm(title: string, text?: string) {
  return Swal.fire({
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: brandColors.blue,
    cancelButtonColor: brandColors.red,
    confirmButtonText: 'Yes, continue',
    cancelButtonText: 'Cancel',
  })
}

export function showLoading(title: string) {
  Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    },
  })
}

export function closeLoading() {
  Swal.close()
}

export { Swal }
