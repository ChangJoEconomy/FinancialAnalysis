const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Preset = require('../models/Preset');
const DefaultPreset = require('../models/DefaultPreset');
const bcrypt = require('bcrypt');

// @desc Get Settings Page with presets
// @route GET /settings
const getSettingsPage = asyncHandler(async (req, res) => {
    // 사용자의 프리셋 목록 가져오기
    const presets = await Preset.find({ user_id: req.user.user_id });
    
    // 기본 프리셋 정보 가져오기
    const defaultPreset = await DefaultPreset.findOne({ user_id: req.user.user_id });

    // 기본 프리셋이 맨 위에 오도록 정렬
    const sortedPresets = presets.sort((a, b) => {
        const defaultPresetName = defaultPreset ? defaultPreset.preset_name : null;
        
        // 기본 프리셋이면 맨 앞으로
        if (a.preset_name === defaultPresetName) return -1;
        if (b.preset_name === defaultPresetName) return 1;
        
        // 나머지는 알파벳 순으로 정렬
        return a.preset_name.localeCompare(b.preset_name, 'ko');
    });

    console.log('User presets:', defaultPreset);
    
    res.render('settings', { 
        title: '개인설정',
        user: req.user,
        presets: sortedPresets,
        defaultPreset: defaultPreset ? defaultPreset.preset_name : null
    });
});

// @desc Save or Update Preset
// @route POST /settings/preset
const savePreset = asyncHandler(async (req, res) => {
    const {
        preset_name,
        description,
        mode, // 'add' 또는 'edit' 모드 구분
        netIncome_warning,
        netIncome_danger,
        netIncome_caution,
        marketCap_warning,
        marketCap_danger,
        marketCap_caution,
        per_warning,
        per_danger,
        per_caution,
        debt_warning,
        debt_danger,
        debt_caution,
        quick_warning,
        quick_danger,
        quick_caution,
        dividend_warning,
        dividend_danger,
        dividend_caution
    } = req.body;

    // 필수 필드 검증
    if (!preset_name || !description) {
        return res.status(400).json({
            success: false,
            message: '프리셋 이름과 메모를 입력해주세요.'
        });
    }

    // 숫자 필드 검증
    const requiredFields = [
        netIncome_warning, netIncome_danger, netIncome_caution,
        marketCap_warning, marketCap_danger, marketCap_caution,
        per_warning, per_danger, per_caution,
        debt_warning, debt_danger, debt_caution,
        quick_warning, quick_danger, quick_caution,
        dividend_warning, dividend_danger, dividend_caution
    ];

    if (requiredFields.some(field => field === undefined || field === '')) {
        return res.status(400).json({
            success: false,
            message: '모든 수치를 입력해주세요.'
        });
    }

    // 수치 논리 검증
    const validationErrors = [];

    // 당기순이익: 경고 < 위험 < 주의 (값이 클수록 좋음)
    if (Number(netIncome_warning) >= Number(netIncome_danger)) {
        validationErrors.push('당기순이익: 경고 수치는 위험 수치보다 작아야 합니다.');
    }
    if (Number(netIncome_danger) >= Number(netIncome_caution)) {
        validationErrors.push('당기순이익: 위험 수치는 주의 수치보다 작아야 합니다.');
    }

    // 당좌비율: 경고 < 위험 < 주의 (값이 클수록 좋음)
    if (Number(quick_warning) >= Number(quick_danger)) {
        validationErrors.push('당좌비율: 경고 수치는 위험 수치보다 작아야 합니다.');
    }
    if (Number(quick_danger) >= Number(quick_caution)) {
        validationErrors.push('당좌비율: 위험 수치는 주의 수치보다 작아야 합니다.');
    }

    // 시가배당률: 경고 < 위험 < 주의 (값이 클수록 좋음)
    if (Number(dividend_warning) >= Number(dividend_danger)) {
        validationErrors.push('시가배당률: 경고 수치는 위험 수치보다 작아야 합니다.');
    }
    if (Number(dividend_danger) >= Number(dividend_caution)) {
        validationErrors.push('시가배당률: 위험 수치는 주의 수치보다 작아야 합니다.');
    }

    // 시가총액: 경고 > 위험 > 주의 (값이 작을수록 좋음)
    if (Number(marketCap_warning) <= Number(marketCap_danger)) {
        validationErrors.push('시가총액: 경고 수치는 위험 수치보다 커야 합니다.');
    }
    if (Number(marketCap_danger) <= Number(marketCap_caution)) {
        validationErrors.push('시가총액: 위험 수치는 주의 수치보다 커야 합니다.');
    }

    // PER: 경고 > 위험 > 주의 (값이 작을수록 좋음)
    if (Number(per_warning) <= Number(per_danger)) {
        validationErrors.push('PER: 경고 수치는 위험 수치보다 커야 합니다.');
    }
    if (Number(per_danger) <= Number(per_caution)) {
        validationErrors.push('PER: 위험 수치는 주의 수치보다 커야 합니다.');
    }

    // 부채비율: 경고 > 위험 > 주의 (값이 작을수록 좋음)
    if (Number(debt_warning) <= Number(debt_danger)) {
        validationErrors.push('부채비율: 경고 수치는 위험 수치보다 커야 합니다.');
    }
    if (Number(debt_danger) <= Number(debt_caution)) {
        validationErrors.push('부채비율: 위험 수치는 주의 수치보다 커야 합니다.');
    }

    // 안전 수치는 주의 수치와 동일해야 함
    // 참고: 안전 수치는 netIncome_safe, marketCap_safe, per_safe, debt_safe, quick_safe, dividend_safe
    // 하지만 이 필드들은 프론트엔드에서만 사용되고 실제 저장되지 않으므로 별도 검증 불필요

    // 검증 오류가 있으면 반환
    if (validationErrors.length > 0) {
        return res.status(400).json({
            success: false,
            message: '수치 설정에 오류가 있습니다:\n\n' + validationErrors.join('\n')
        });
    }

    try {
        // 기존 프리셋이 있는지 확인
        const existingPreset = await Preset.findOne({
            user_id: req.user.user_id,
            preset_name: preset_name
        });

        const presetData = {
            user_id: req.user.user_id,
            preset_name,
            description,
            netIncome_warning: Number(netIncome_warning),
            netIncome_danger: Number(netIncome_danger),
            netIncome_caution: Number(netIncome_caution),
            marketCap_warning: Number(marketCap_warning),
            marketCap_danger: Number(marketCap_danger),
            marketCap_caution: Number(marketCap_caution),
            per_warning: Number(per_warning),
            per_danger: Number(per_danger),
            per_caution: Number(per_caution),
            debt_warning: Number(debt_warning),
            debt_danger: Number(debt_danger),
            debt_caution: Number(debt_caution),
            quick_warning: Number(quick_warning),
            quick_danger: Number(quick_danger),
            quick_caution: Number(quick_caution),
            dividend_warning: Number(dividend_warning),
            dividend_danger: Number(dividend_danger),
            dividend_caution: Number(dividend_caution)
        };

        if (mode === 'edit') {
            // 수정 모드: 프리셋이 존재하는지 확인 후 업데이트
            if (!existingPreset) {
                return res.status(404).json({
                    success: false,
                    message: '수정할 프리셋을 찾을 수 없습니다.'
                });
            }
            await Preset.findByIdAndUpdate(existingPreset._id, presetData);
            res.json({
                success: true,
                message: '프리셋이 수정되었습니다.'
            });
        } else if (mode === 'add') {
            // 추가 모드: 중복 이름 검사 후 새 프리셋 생성
            if (existingPreset) {
                return res.status(400).json({
                    success: false,
                    message: '이미 같은 이름의 프리셋이 존재합니다.'
                });
            }
            const newPreset = new Preset(presetData);
            await newPreset.save();
            res.json({
                success: true,
                message: '프리셋이 저장되었습니다.'
            });
        } else {
            // 유효하지 않은 모드
            res.status(400).json({
                success: false,
                message: '유효하지 않은 요청입니다.'
            });
        }
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: '이미 같은 이름의 프리셋이 존재합니다.'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '프리셋 저장 중 오류가 발생했습니다.'
            });
        }
    }
});

// @desc Get Preset Data for editing
// @route GET /settings/preset/:name
const getPreset = asyncHandler(async (req, res) => {
    const presetName = req.params.name;
    
    const preset = await Preset.findOne({
        user_id: req.user.user_id,
        preset_name: presetName
    });

    if (!preset) {
        return res.status(404).json({
            success: false,
            message: '프리셋을 찾을 수 없습니다.'
        });
    }

    res.json({
        success: true,
        preset: preset
    });
});

// @desc Delete Preset
// @route DELETE /settings/preset/:name
const deletePreset = asyncHandler(async (req, res) => {
    const presetName = req.params.name;

    // 기본 프리셋인지 확인
    const defaultPreset = await DefaultPreset.findOne({ user_id: req.user.user_id });
    if (defaultPreset && defaultPreset.preset_name === presetName) {
        return res.status(400).json({
            success: false,
            message: '기본 프리셋으로 설정된 프리셋은 삭제할 수 없습니다. 먼저 다른 프리셋을 기본으로 설정해주세요.'
        });
    }

    const result = await Preset.findOneAndDelete({
        user_id: req.user.user_id,
        preset_name: presetName
    });

    if (!result) {
        return res.status(404).json({
            success: false,
            message: '프리셋을 찾을 수 없습니다.'
        });
    }

    res.json({
        success: true,
        message: '프리셋이 삭제되었습니다.'
    });
});

// @desc Set Default Preset
// @route POST /settings/default-preset
const setDefaultPreset = asyncHandler(async (req, res) => {
    const { preset_name } = req.body;
    
    if (!preset_name) {
        return res.status(400).json({
            success: false,
            message: '프리셋 이름이 필요합니다.'
        });
    }
    
    // 프리셋이 실제로 존재하는지 확인
    const preset = await Preset.findOne({
        user_id: req.user.user_id,
        preset_name: preset_name
    });
    
    if (!preset) {
        return res.status(404).json({
            success: false,
            message: '존재하지 않는 프리셋입니다.'
        });
    }
    
    // 기존 기본 프리셋 업데이트 또는 새로 생성
    await DefaultPreset.findOneAndUpdate(
        { user_id: req.user.user_id },
        { preset_name: preset_name },
        { upsert: true, new: true }
    );
    
    res.json({
        success: true,
        message: `"${preset_name}"이(가) 기본 프리셋으로 설정되었습니다.`
    });
});

// @desc Change Password
// @route POST /settings/change-password
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).render('settings', {
            title: '개인설정',
            error_type: 'change-password',
            error: '모든 필드를 입력해야 합니다.',
            user: req.user,
            presets: await Preset.find({ user_id: req.user.user_id })
        });
    }

    // user 정보 가져오기
    const user = await User.findOne({ user_id: req.user.user_id });
    if(!user) {
        return res.status(401).render('settings', {
            title: '개인설정',
            error_type: 'change-password',
            error: '로그인 정보가 올바르지 않습니다. 다시 로그인해주세요.',
            user: null,
            presets: []
        });
    }

    // 현재 비밀번호 일치 여부 확인
    const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isMatch) {
        return res.status(400).render('settings', {
            title: '개인설정',
            error_type: 'change-password',
            error: '현재 비밀번호가 일치하지 않습니다.',
            user: req.user,
            presets: await Preset.find({ user_id: req.user.user_id })
        });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).render('settings', {
            title: '개인설정',
            error_type: 'change-password',
            error: '비밀번호 확인이 일치하지 않습니다.',
            user: req.user,
            presets: await Preset.find({ user_id: req.user.user_id })
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).render('settings', {
            title: '개인설정',
            error_type: 'change-password',
            error: '비밀번호는 최소 6자 이상이어야 합니다.',
            user: req.user,
            presets: await Preset.find({ user_id: req.user.user_id })
        });
    }

    // 새 비밀번호 해싱 및 업데이트
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.hashedPassword = hashedNewPassword;
    await user.save();

    // 로그아웃
    res.clearCookie('token');
    // 로그인 페이지로 리다이렉트
    res.redirect('/login');
});

module.exports = {
    getSettingsPage,
    savePreset,
    getPreset,
    deletePreset,
    setDefaultPreset,
    changePassword
};